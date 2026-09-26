import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { LoginDTO, RegisterDTO } from "../dtos/auth.dtos.js";
import { validateRegisterForm } from "../utils/auth.validation.js";
import { sendEmailOtp, sendPasswordResetOtp, } from "../services/email.service.js";
import { sendPhoneOtp, verifyPhoneOtp } from "../services/twilio.service.js";
import cloudinary from "../config/cloudinary.config.js";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    ACCESS_TOKEN_COOKIE_MAX_AGE,
    REFRESH_TOKEN_COOKIE_MAX_AGE_REMEMBER,
    REFRESH_TOKEN_COOKIE_MAX_AGE_DEFAULT,
    TokenPayload,
    getAuthCookieOptions,
} from "../utils/jwt.js";
import { auditLog } from "../utils/auditLogger.js";

import {
    encryptSensitiveData,
    safeDecryptSensitiveData,
    generateEphemeralSessionKey,
} from "../services/encryption.service.js";
import { generateOtp, hashOtp, verifyOtpHash } from "../utils/otp.js";

const clearEmailOtp = async (userId: any) => {
    await User.updateOne(
        { _id: userId },
        {
            $unset: {
                emailOtp: "",
                emailOtpExpiresAt: "",
                emailOtpResendAvailableAt: "",
            },
            $set: {
                emailOtpAttempts: 0,
            },
        }
    );
};

const clearPhoneOtp = async (userId: any) => {
    await User.updateOne(
        { _id: userId },
        {
            $unset: {
                phoneOtp: "",
                phoneOtpExpiresAt: "",
                phoneOtpResendAvailableAt: "",
            },
            $set: {
                phoneOtpAttempts: 0,
            },
        }
    );
};

const clearResetPasswordOtp = async (userId: any) => {
    await User.updateOne(
        { _id: userId },
        {
            $unset: {
                resetPasswordOtp: "",
                resetPasswordOtpExpiresAt: "",
                resetPasswordOtpResendAvailableAt: "",
                resetPasswordSessionId: "",
            },
            $set: {
                resetPasswordOtpAttempts: 0,
            },
        }
    );
};
const getSecret = (key: string): string => {
    const secret = process.env[key];
    if (!secret) {
        throw new Error(`${key} is missing`);
    }
    return secret;
};
const generateToken = (userId: string, secretKey: string, expiresIn: string): string => jwt.sign({ userId }, getSecret(secretKey), { expiresIn } as jwt.SignOptions);
const cookieOptions = {
    get httpOnly() { return getAuthCookieOptions().httpOnly; },
    get secure() { return getAuthCookieOptions().secure; },
    get sameSite() { return getAuthCookieOptions().sameSite; },
    get path() { return getAuthCookieOptions().path; },
    get domain() { return getAuthCookieOptions().domain; },
};
const normalizeEmail = (email: string) => String(email).trim().toLowerCase();
const normalizePhone = (phone: string) => String(phone).trim();
const getRemainingSeconds = (date: Date) => Math.ceil((date.getTime() - Date.now()) / 1000);
const otpBlockedResponse = (res: Response, seconds: number): void => {
    res.status(429).json({
        success: false,
        code: "OTP_BLOCKED",
        message: `Too many incorrect attempts. Try again in ${Math.ceil(seconds / 60)} minutes.`,
        data: {
            retryAfterSeconds: seconds,
        },
    });
};
const cooldownResponse = (res: Response, seconds: number): void => {
    res.status(429).json({
        success: false,
        code: "RESEND_COOLDOWN",
        message: `Please wait ${seconds} seconds before requesting another OTP.`,
        data: {
            retryAfterSeconds: seconds,
        },
    });
};
const checkOtpBlock = (res: Response, blockedUntil?: Date): boolean => {
    if (!blockedUntil || blockedUntil.getTime() <= Date.now()) {
        return false;
    }
    otpBlockedResponse(res, getRemainingSeconds(blockedUntil));
    return true;
};
const checkCooldown = (res: Response, availableAt?: Date): boolean => {
    if (!availableAt || availableAt.getTime() <= Date.now()) {
        return false;
    }
    cooldownResponse(res, getRemainingSeconds(availableAt));
    return true;
};
const invalidCredentials = (res: Response): void => {
    res.status(401).json({
        success: false,
        message: "Invalid email/phone or password",
    });
};
const userResponse = (user: any) => ({
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    country: user.country,
    countryCode: user.countryCode,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender,
    qualification: user.qualification,
    role: user.role,
    employeeId: user.employeeId,
    department: user.department,
    designation: user.designation,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    profilePhoto: user.profilePhoto,
});
const clearAuthCookies = (res: Response): void => {
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
};
export const register = async (req: Request<{}, {}, RegisterDTO>, res: Response, next: NextFunction): Promise<void> => {
    try {
        const requestBody = req.body as Record<string, any>;
        const body = {
            ...req.body,
            termsAccepted: requestBody.termsAccepted === "true"
                ? true
                : requestBody.termsAccepted === "false"
                    ? false
                    : requestBody.termsAccepted,
        };
        const errors = validateRegisterForm(body);
        if (Object.keys(errors).length) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors,
            });
            return;
        }
        const { firstName, lastName, email, country, countryCode, phone, dateOfBirth, gender, password, qualification, } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = normalizePhone(phone);
        if (await User.exists({ email: normalizedEmail })) {
            res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
            return;
        }
        if (await User.exists({ phone: normalizedPhone })) {
            res.status(409).json({
                success: false,
                message: "Phone number is already registered",
            });
            return;
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const emailOtp = generateOtp();
        const emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const phoneOtp = generateOtp();
        const phoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        let profilePhoto: string | undefined;
        let profilePhotoPublicId: string | undefined;
        if (req.file) {
            const uploadResult = await new Promise<{
                secure_url: string;
                public_id: string;
            }>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({
                    folder: "mindmatrix/profile-photos",
                    resource_type: "image",
                    transformation: [
                        {
                            width: 500,
                            height: 500,
                            crop: "fill",
                            gravity: "face",
                        },
                    ],
                }, (error, result) => {
                    if (error)
                        return reject(error);
                    if (!result) {
                        return reject(new Error("Cloudinary upload failed"));
                    }
                    resolve({
                        secure_url: result.secure_url,
                        public_id: result.public_id,
                    });
                });
                uploadStream.end(req.file!.buffer);
            });
            profilePhoto = uploadResult.secure_url;
            profilePhotoPublicId = uploadResult.public_id;
        }
        let user;
        try {
            user = await User.create({
                firstName,
                lastName,
                email: normalizedEmail,
                country,
                countryCode,
                phone: normalizedPhone,
                dateOfBirth: new Date(dateOfBirth),
                gender,
                password: hashedPassword,
                qualification,
                role: "user",
                profilePhoto,
                profilePhotoPublicId,
                isEmailVerified: false,
                emailOtp: hashOtp(emailOtp),
                emailOtpExpiresAt,
                emailOtpAttempts: 0,
                emailOtpBlockedUntil: undefined,
                emailOtpResendAvailableAt: new Date(Date.now() + 60 * 1000),
                isPhoneVerified: false,
                phoneOtp: hashOtp(phoneOtp),
                phoneOtpExpiresAt,
                phoneOtpAttempts: 0,
                phoneOtpBlockedUntil: undefined,
                phoneOtpResendAvailableAt: new Date(Date.now() + 60 * 1000),
            });
        }
        catch (dbError) {
            if (profilePhotoPublicId) {
                try {
                    await cloudinary.uploader.destroy(profilePhotoPublicId);
                }
                catch (error) {
                    console.error("Failed to delete Cloudinary image:", error);
                }
            }
            throw dbError;
        }
        Promise.all([
            sendEmailOtp(normalizedEmail, firstName, emailOtp),
            sendPhoneOtp(normalizedPhone, phoneOtp),
        ]).catch((error) => {
            console.error("OTP sending error:", error);
        });
        res.status(201).json({
            success: true,
            message: "Registration successful. OTP sent to your email and phone.",
            data: {
                user: userResponse(user),
            },
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        next(error);
    }
};
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
            return;
        }
        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({
            email: normalizedEmail,
        }).select("+emailOtp +emailOtpExpiresAt +emailOtpAttempts +emailOtpBlockedUntil +emailOtpResendAvailableAt");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        if (user.isEmailVerified) {
            res.status(400).json({
                success: false,
                message: "Email is already verified",
            });
            return;
        }
        if (checkOtpBlock(res, user.emailOtpBlockedUntil)) {
            return;
        }
        if (!user.emailOtp || !user.emailOtpExpiresAt) {
            await clearEmailOtp(user._id);
            res.status(400).json({
                success: false,
                code: "INVALID_OTP",
                message: "OTP is invalid or expired",
            });
            return;
        }
        if (user.emailOtpExpiresAt.getTime() < Date.now()) {
            await clearEmailOtp(user._id);
            res.status(400).json({
                success: false,
                code: "OTP_EXPIRED",
                message: "OTP has expired",
            });
            return;
        }
        const isMatch = verifyOtpHash(String(otp).trim(), user.emailOtp);
        if (!isMatch) {
            user.emailOtpAttempts = (user.emailOtpAttempts || 0) + 1;
            if (user.emailOtpAttempts >= 5) {
                user.emailOtpBlockedUntil = new Date(Date.now() + 10 * 60 * 1000);
                await user.save();
                await clearEmailOtp(user._id);
                otpBlockedResponse(res, 10 * 60);
                return;
            }
            await user.save();
            res.status(400).json({
                success: false,
                code: "INVALID_OTP",
                message: `Invalid OTP. ${5 - user.emailOtpAttempts} attempts remaining.`,
            });
            return;
        }
        user.isEmailVerified = true;
        await user.save();
        await clearEmailOtp(user._id);
        res.status(200).json({
            success: true,
            message: "Email verified successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
export const verifyPhone = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            res.status(400).json({
                success: false,
                message: "Phone and OTP are required",
            });
            return;
        }
        const normalizedPhone = normalizePhone(phone);
        const user = await User.findOne({
            phone: normalizedPhone,
        }).select("+phoneOtp +phoneOtpExpiresAt +phoneOtpAttempts +phoneOtpBlockedUntil +phoneOtpResendAvailableAt");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        if (user.isPhoneVerified) {
            res.status(400).json({
                success: false,
                message: "Phone number is already verified",
            });
            return;
        }
        if (checkOtpBlock(res, user.phoneOtpBlockedUntil)) {
            return;
        }
        if (user.phoneOtp && user.phoneOtpExpiresAt && user.phoneOtpExpiresAt.getTime() < Date.now()) {
            await clearPhoneOtp(user._id);
            res.status(400).json({
                success: false,
                code: "OTP_EXPIRED",
                message: "Phone OTP has expired",
            });
            return;
        }

        let isApproved = false;
        if (user.phoneOtp) {
            isApproved = verifyOtpHash(String(otp).trim(), user.phoneOtp);
        }

        if (!isApproved) {
            try {
                const verification = await verifyPhoneOtp(normalizedPhone, String(otp).trim());
                if (verification && (verification.status === "approved" || verification.valid === true)) {
                    isApproved = true;
                }
            } catch {
                // Twilio verify error or mismatch
            }
        }

        if (!isApproved) {
            user.phoneOtpAttempts = (user.phoneOtpAttempts || 0) + 1;
            if (user.phoneOtpAttempts >= 5) {
                user.phoneOtpBlockedUntil = new Date(Date.now() + 10 * 60 * 1000);
                await user.save();
                await clearPhoneOtp(user._id);
                otpBlockedResponse(res, 10 * 60);
                return;
            }
            await user.save();
            res.status(400).json({
                success: false,
                code: "INVALID_OTP",
                message: `Invalid phone OTP. ${5 - user.phoneOtpAttempts} attempts remaining.`,
            });
            return;
        }

        user.isPhoneVerified = true;
        await user.save();
        await clearPhoneOtp(user._id);

        res.status(200).json({
            success: true,
            message: "Phone verified successfully",
        });
    }
    catch (error) {
        console.error("Phone verification error:", error);
        next(error);
    }
};
export const resendEmailOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                message: "Email is required",
            });
            return;
        }
        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({
            email: normalizedEmail,
        }).select("+emailOtp +emailOtpExpiresAt +emailOtpAttempts +emailOtpBlockedUntil +emailOtpResendAvailableAt");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        if (user.isEmailVerified) {
            res.status(400).json({
                success: false,
                message: "Email is already verified",
            });
            return;
        }
        if (checkOtpBlock(res, user.emailOtpBlockedUntil)) {
            return;
        }
        if (checkCooldown(res, user.emailOtpResendAvailableAt)) {
            return;
        }
        const emailOtp = generateOtp();
        user.emailOtp = hashOtp(emailOtp);
        user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        user.emailOtpAttempts = 0;
        user.emailOtpBlockedUntil = undefined;
        user.emailOtpResendAvailableAt = new Date(Date.now() + 60 * 1000);
        await user.save();
        await sendEmailOtp(user.email, user.firstName, emailOtp);
        res.status(200).json({
            success: true,
            message: "Email OTP sent successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
export const resendPhoneOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { phone } = req.body;
        if (!phone) {
            res.status(400).json({
                success: false,
                message: "Phone number is required",
            });
            return;
        }
        const normalizedPhone = normalizePhone(phone);
        const user = await User.findOne({
            phone: normalizedPhone,
        }).select("+phoneOtp +phoneOtpExpiresAt +phoneOtpAttempts +phoneOtpBlockedUntil +phoneOtpResendAvailableAt");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        if (user.isPhoneVerified) {
            res.status(400).json({
                success: false,
                message: "Phone number is already verified",
            });
            return;
        }
        if (checkOtpBlock(res, user.phoneOtpBlockedUntil)) {
            return;
        }
        if (checkCooldown(res, user.phoneOtpResendAvailableAt)) {
            return;
        }
        const phoneOtp = generateOtp();
        user.phoneOtp = hashOtp(phoneOtp);
        user.phoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        user.phoneOtpAttempts = 0;
        user.phoneOtpBlockedUntil = undefined;
        user.phoneOtpResendAvailableAt = new Date(Date.now() + 60 * 1000);
        await user.save();
        await sendPhoneOtp(normalizedPhone, phoneOtp);
        res.status(200).json({
            success: true,
            message: "Phone OTP sent successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
export const resendVerificationOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                message: "Email is required",
            });
            return;
        }
        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({
            email: normalizedEmail,
        }).select("+emailOtp +emailOtpExpiresAt +emailOtpAttempts +emailOtpBlockedUntil +emailOtpResendAvailableAt +phoneOtp +phoneOtpExpiresAt +phoneOtpAttempts +phoneOtpBlockedUntil +phoneOtpResendAvailableAt");
        if (!user) {
            res.status(200).json({
                success: true,
                message: "If verification is required, a new OTP has been requested.",
            });
            return;
        }
        if (user.isEmailVerified || user.isPhoneVerified) {
            res.status(400).json({
                success: false,
                code: "ALREADY_VERIFIED",
                message: "Verification is already complete.",
            });
            return;
        }
        if (checkOtpBlock(res, user.emailOtpBlockedUntil)) {
            return;
        }
        if (checkCooldown(res, user.emailOtpResendAvailableAt)) {
            return;
        }
        const emailOtp = generateOtp();
        user.emailOtp = hashOtp(emailOtp);
        user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        user.emailOtpAttempts = 0;
        user.emailOtpBlockedUntil = undefined;
        user.emailOtpResendAvailableAt = new Date(Date.now() + 60 * 1000);
        await user.save();
        await sendEmailOtp(user.email, user.firstName, emailOtp);
        let phoneSent = false;
        if (!user.isPhoneVerified &&
            (!user.phoneOtpResendAvailableAt ||
                user.phoneOtpResendAvailableAt.getTime() <= Date.now()) &&
            (!user.phoneOtpBlockedUntil ||
                user.phoneOtpBlockedUntil.getTime() <= Date.now())) {
            const phoneOtp = generateOtp();
            user.phoneOtp = hashOtp(phoneOtp);
            user.phoneOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
            user.phoneOtpAttempts = 0;
            user.phoneOtpBlockedUntil = undefined;
            user.phoneOtpResendAvailableAt = new Date(Date.now() + 60 * 1000);
            await user.save();
            await sendPhoneOtp(user.phone, phoneOtp);
            phoneSent = true;
        }
        res.status(200).json({
            success: true,
            message: "Fresh verification OTP sent successfully.",
            data: {
                emailSent: true,
                phoneSent,
                otpExpiresInSeconds: 600,
                resendAvailableInSeconds: 60,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                message: "Email is required",
            });
            return;
        }
        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({
            email: normalizedEmail,
        });
        if (!user) {
            res.status(200).json({
                success: true,
                message: "If an account exists with this email, a password reset OTP has been sent.",
            });
            return;
        }
        if (user.resetPasswordOtpBlockedUntil &&
            checkOtpBlock(res, user.resetPasswordOtpBlockedUntil)) {
            return;
        }
        if (checkCooldown(res, user.resetPasswordOtpResendAvailableAt)) {
            return;
        }
        const resetPasswordOtp = generateOtp();
        user.resetPasswordOtp = hashOtp(resetPasswordOtp);
        user.resetPasswordOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        user.resetPasswordOtpAttempts = 0;
        user.resetPasswordOtpBlockedUntil = undefined;
        user.resetPasswordOtpResendAvailableAt = new Date(Date.now() + 60 * 1000);
        await user.save();
        await sendPasswordResetOtp(user.email, user.firstName, resetPasswordOtp);
        res.status(200).json({
            success: true,
            message: "If an account exists with this email, a password reset OTP has been sent.",
            data: {
                email: user.email,
                otpExpiresInSeconds: 600,
                resendAvailableInSeconds: 60,
            },
        });
    }
    catch (error) {
        console.error("Forgot password error:", error);
        next(error);
    }
};
export const resendResetPasswordOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                message: "Email is required",
            });
            return;
        }
        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({
            email: normalizedEmail,
        });
        if (!user) {
            res.status(200).json({
                success: true,
                message: "If an account exists with this email, a password reset OTP has been sent.",
            });
            return;
        }
        if (checkOtpBlock(res, user.resetPasswordOtpBlockedUntil)) {
            return;
        }
        if (checkCooldown(res, user.resetPasswordOtpResendAvailableAt)) {
            return;
        }
        const resetPasswordOtp = generateOtp();
        user.resetPasswordOtp = hashOtp(resetPasswordOtp);
        user.resetPasswordOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        user.resetPasswordOtpAttempts = 0;
        user.resetPasswordOtpBlockedUntil = undefined;
        user.resetPasswordOtpResendAvailableAt = new Date(Date.now() + 60 * 1000);
        await user.save();
        await sendPasswordResetOtp(user.email, user.firstName, resetPasswordOtp);
        res.status(200).json({
            success: true,
            message: "Password reset OTP sent successfully.",
            data: {
                email: user.email,
                otpExpiresInSeconds: 600,
                resendAvailableInSeconds: 60,
            },
        });
    }
    catch (error) {
        console.error("Resend reset password OTP error:", error);
        next(error);
    }
};
export const verifyResetPasswordOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
            return;
        }
        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({
            email: normalizedEmail,
        }).select("+resetPasswordOtp +resetPasswordOtpExpiresAt +resetPasswordOtpAttempts +resetPasswordOtpBlockedUntil +resetPasswordOtpResendAvailableAt");
        if (!user) {
            res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
            });
            return;
        }
        if (checkOtpBlock(res, user.resetPasswordOtpBlockedUntil)) {
            return;
        }
        if (!user.resetPasswordOtp || !user.resetPasswordOtpExpiresAt) {
            await clearResetPasswordOtp(user._id);
            res.status(400).json({
                success: false,
                code: "INVALID_OTP",
                message: "OTP is invalid or expired",
            });
            return;
        }
        if (user.resetPasswordOtpExpiresAt.getTime() < Date.now()) {
            await clearResetPasswordOtp(user._id);
            res.status(400).json({
                success: false,
                code: "OTP_EXPIRED",
                message: "OTP has expired",
            });
            return;
        }
        const isMatch = verifyOtpHash(String(otp).trim(), user.resetPasswordOtp);
        if (!isMatch) {
            user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1;
            if (user.resetPasswordOtpAttempts >= 5) {
                user.resetPasswordOtpBlockedUntil = new Date(Date.now() + 10 * 60 * 1000);
                await user.save();
                await clearResetPasswordOtp(user._id);
                otpBlockedResponse(res, 10 * 60);
                return;
            }
            await user.save();
            res.status(400).json({
                success: false,
                code: "INVALID_OTP",
                message: `Invalid OTP. ${5 - user.resetPasswordOtpAttempts} attempts remaining.`,
            });
            return;
        }
        const resetToken = jwt.sign({
            userId: String(user._id),
            purpose: "password_reset",
        }, getSecret("JWT_ACCESS_SECRET"), { expiresIn: "10m" });
        await clearResetPasswordOtp(user._id);
        res.status(200).json({
            success: true,
            message: "OTP verified successfully. You can now reset your password.",
            data: {
                resetToken,
                expiresInSeconds: 600,
            },
        });
    }
    catch (error) {
        console.error("Verify reset password OTP error:", error);
        next(error);
    }
};
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { resetToken, newPassword, confirmPassword } = req.body;
        if (!resetToken || !newPassword || !confirmPassword) {
            res.status(400).json({
                success: false,
                message: "Reset token, new password and confirm password are required",
            });
            return;
        }
        if (newPassword !== confirmPassword) {
            res.status(400).json({
                success: false,
                code: "PASSWORD_MISMATCH",
                message: "Passwords do not match",
            });
            return;
        }
        if (String(newPassword).length < 8) {
            res.status(400).json({
                success: false,
                code: "WEAK_PASSWORD",
                message: "Password must be at least 8 characters long",
            });
            return;
        }
        let decoded: {
            userId: string;
            purpose: string;
        };
        try {
            decoded = jwt.verify(resetToken, getSecret("JWT_ACCESS_SECRET")) as {
                userId: string;
                purpose: string;
            };
        }
        catch {
            res.status(401).json({
                success: false,
                code: "INVALID_RESET_TOKEN",
                message: "Password reset session is invalid or expired. Please request a new OTP.",
            });
            return;
        }
        if (decoded.purpose !== "password_reset") {
            res.status(401).json({
                success: false,
                code: "INVALID_RESET_TOKEN",
                message: "Invalid password reset session",
            });
            return;
        }
        const user = await User.findById(decoded.userId).select("+password email firstName lastName role");
        if (!user) {
            res.status(401).json({
                success: false,
                code: "INVALID_RESET_TOKEN",
                message: "Invalid password reset session",
            });
            return;
        }
        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();
        await clearResetPasswordOtp(user._id);
        clearAuthCookies(res);
        auditLog("PASSWORD_RESET_SUCCESS", "SUCCESS", req, {
            userId: String(user._id),
            userEmail: user.email,
            userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            role: user.role,
            details: { action: "Password reset successfully" },
        });
        res.status(200).json({
            success: true,
            message: "Password reset successfully. Please login with your new password.",
        });
    }
    catch (error) {
        console.error("Reset password error:", error);
        next(error);
    }
};
export const login = async (req: Request<{}, {}, LoginDTO>, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { identifier, email, password, rememberMe = false } = req.body;
        const rawIdentifier = identifier || email;
        const isRememberMe = typeof rememberMe === "boolean" ? rememberMe : false;

        if (typeof rawIdentifier !== "string" ||
            typeof password !== "string" ||
            !rawIdentifier.trim() ||
            !password) {

            res.status(400).json({
                success: false,
                message: "Email/phone and password are required",
            });
            return;
        }
        const normalizedIdentifier = rawIdentifier.trim();
        const isEmail = normalizedIdentifier.includes("@");

        let normalizedPhone = normalizedIdentifier;
        if (!isEmail) {
            normalizedPhone = normalizedIdentifier.replace(/[\s\-()]/g, "");
            if (/^[6-9]\d{9}$/.test(normalizedPhone)) {
                normalizedPhone = `+91${normalizedPhone}`;
            }
        }
        const user = await User.findOne(isEmail
            ? {
                email: normalizedIdentifier.toLowerCase(),
            }
            : {
                phone: normalizedPhone,
            }).select("+password");
        if (!user) {
            invalidCredentials(res);
            auditLog("AUTH_LOGIN_FAILED", "FAILURE", req, {
                userEmail: isEmail ? normalizedIdentifier.toLowerCase() : undefined,
                details: {
                    identifier: normalizedIdentifier,
                    reason: "User not found",
                },
            });
            return;
        }
        if (user.isBlocked) {
            auditLog("AUTH_ACCOUNT_LOCKED", "BLOCKED", req, {
                userId: String(user._id),
                userEmail: user.email,
                userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                role: user.role,
                details: {
                    reason: "Attempted login on blocked account",
                },
            });
            res.status(403).json({
                success: false,
                code: "ACCOUNT_BLOCKED",
                message: "Your account has been blocked by the administrator.",
            });
            return;
        }

        const passwordMatched = await bcrypt.compare(password, user.password);
        if (!passwordMatched) {
            invalidCredentials(res);
            auditLog("AUTH_LOGIN_FAILED", "FAILURE", req, {
                userId: String(user._id),
                userEmail: user.email,
                userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                role: user.role,
                details: {
                    identifier: normalizedIdentifier,
                    reason: "Incorrect password",
                },
            });
            return;
        }
        if (!user.isEmailVerified && !user.isPhoneVerified) {
            res.status(403).json({
                success: false,
                code: "BOTH_NOT_VERIFIED",
                message: "Email and phone number are not verified. Please verify both before logging in.",
                data: {
                    email: user.email,
                    phone: user.phone,
                    emailVerified: false,
                    phoneVerified: false,
                },
            });
            return;
        }
        if (isEmail && !user.isEmailVerified) {
            res.status(403).json({
                success: false,
                code: "EMAIL_NOT_VERIFIED",
                message: "Email address is not verified. Please verify your email before logging in.",
                data: {
                    email: user.email,
                    phone: user.phone,
                    emailVerified: false,
                    phoneVerified: user.isPhoneVerified,
                },
            });
            return;
        }
        if (!isEmail && !user.isPhoneVerified) {
            res.status(403).json({
                success: false,
                code: "PHONE_NOT_VERIFIED",
                message: "Phone number is not verified. Please verify your phone before logging in.",
                data: {
                    email: user.email,
                    phone: user.phone,
                    emailVerified: user.isEmailVerified,
                    phoneVerified: false,
                },
            });
            return;
        }
        const role = user.role;
        const validRoles = [
            "super_admin",
            "administrator",
            "admin",
            "employee",
            "user",
        ];
        if (!validRoles.includes(role)) {
            console.error("Invalid user role:", role, "User:", user._id);
            res.status(403).json({
                success: false,
                message: "Invalid account role. Please contact administrator.",
            });
            return;
        }
        // =====================================================
        // STATELESS JWT GENERATION & COOKIES
        // =====================================================
        const tokenPayload: TokenPayload = {
            userId: String(user._id),
            role: role,
            rememberMe: isRememberMe,
        };

        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload, isRememberMe);

        res.cookie("accessToken", accessToken, {
            ...cookieOptions,
            maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE,
        });
        res.cookie("refreshToken", refreshToken, {
            ...cookieOptions,
            maxAge: isRememberMe
                ? REFRESH_TOKEN_COOKIE_MAX_AGE_REMEMBER
                : REFRESH_TOKEN_COOKIE_MAX_AGE_DEFAULT,
        });

        const safeUser = userResponse(user);
        auditLog("AUTH_LOGIN_SUCCESS", "SUCCESS", req, {
            userId: String(user._id),
            userEmail: user.email,
            userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            role: user.role,
            details: {
                method: isEmail ? "email" : "phone",
                role: user.role,
                action: "User logged in",
            },
        });
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: safeUser,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        next(error);
    }
};
export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            res.status(401).json({
                success: false,
                message: "Refresh token is missing.",
            });
            return;
        }

        let decoded: TokenPayload;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch {
            clearAuthCookies(res);
            res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token.",
            });
            return;
        }

        if (decoded.type && decoded.type !== "refresh") {
            clearAuthCookies(res);
            res.status(401).json({
                success: false,
                message: "Invalid token type.",
            });
            return;
        }

        const tokenUserId = decoded.userId || decoded.sub;
        if (!tokenUserId) {
            clearAuthCookies(res);
            res.status(401).json({
                success: false,
                message: "Invalid token payload.",
            });
            return;
        }

        // Fetch user from DB to verify authoritative account status
        const user = await User.findById(tokenUserId).select("_id role isBlocked email");
        if (!user) {
            clearAuthCookies(res);
            res.status(401).json({
                success: false,
                message: "User not found.",
            });
            return;
        }

        if (user.isBlocked) {
            clearAuthCookies(res);
            res.status(403).json({
                success: false,
                code: "ACCOUNT_BLOCKED",
                message: "Your account has been blocked by the administrator.",
            });
            return;
        }

        // Generate fresh stateless tokens
        const isRememberMe = typeof decoded.rememberMe === "boolean" ? decoded.rememberMe : false;
        const newAccessToken = generateAccessToken({
            userId: String(user._id),
            role: user.role,
            rememberMe: isRememberMe,
        });

        const newRefreshToken = generateRefreshToken({
            userId: String(user._id),
            role: user.role,
            rememberMe: isRememberMe,
        }, isRememberMe);

        const ttlMs = isRememberMe
            ? REFRESH_TOKEN_COOKIE_MAX_AGE_REMEMBER
            : REFRESH_TOKEN_COOKIE_MAX_AGE_DEFAULT;

        res.cookie("accessToken", newAccessToken, {
            ...cookieOptions,
            maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE,
        });
        res.cookie("refreshToken", newRefreshToken, {
            ...cookieOptions,
            maxAge: ttlMs,
        });

        res.status(200).json({
            success: true,
            message: "Access token refreshed successfully.",
        });
    }
    catch (error) {
        clearAuthCookies(res);
        res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token.",
        });
    }
};
export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        let loggedOutUserId: string | undefined = (req as any).user?.userId;
        let loggedOutRole: string | undefined = (req as any).user?.role;
        let loggedOutEmail: string | undefined = (req as any).user?.email;
        let loggedOutName: string | undefined = (req as any).user?.name;

        const token = req.cookies?.accessToken;
        if (!loggedOutUserId && token && process.env.JWT_ACCESS_SECRET) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET) as any;
                if (decoded?.userId) {
                    loggedOutUserId = decoded.userId;
                    loggedOutRole = decoded.role;
                }
            } catch {
                // ignore token verification error during logout
            }
        }

        if (loggedOutUserId) {
            const u = await User.findById(loggedOutUserId).select("email firstName lastName role");
            if (u) {
                loggedOutEmail = u.email;
                loggedOutName = `${u.firstName || ""} ${u.lastName || ""}`.trim();
                loggedOutRole = u.role;
            }
        }

        auditLog("AUTH_LOGOUT", "SUCCESS", req, {
            userId: loggedOutUserId,
            userEmail: loggedOutEmail,
            userName: loggedOutName,
            role: loggedOutRole,
            details: { action: "User signed out" },
        });

        clearAuthCookies(res);
        res.status(200).json({
            success: true,
            message: "Signed out successfully",
        });
    }
    catch (error) {
        clearAuthCookies(res);
        res.status(200).json({
            success: true,
            message: "Signed out successfully",
        });
    }
};
export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        const user = await User.findById(userId).select("-password -emailOtp -phoneOtp -resetPasswordOtp -profilePhotoPublicId -coverImagePublicId");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            data: user,
        });
    }
    catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        const { firstName, lastName, dateOfBirth, removeProfilePhoto } = req.body || {};
        const profilePhoto = req.file;
        const shouldRemoveProfilePhoto = removeProfilePhoto === true || removeProfilePhoto === "true";
        if (firstName === undefined &&
            lastName === undefined &&
            dateOfBirth === undefined &&
            !profilePhoto &&
            !shouldRemoveProfilePhoto) {
            res.status(400).json({
                success: false,
                message: "At least one field is required",
            });
            return;
        }
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        if (firstName !== undefined) {
            const value = String(firstName).trim();
            if (!value) {
                res.status(400).json({
                    success: false,
                    message: "First name cannot be empty",
                });
                return;
            }
            if (value.length < 2 || value.length > 50) {
                res.status(400).json({
                    success: false,
                    message: "First name must be between 2 and 50 characters",
                });
                return;
            }
            user.firstName = value;
        }
        if (lastName !== undefined) {
            const value = String(lastName).trim();
            if (!value) {
                res.status(400).json({
                    success: false,
                    message: "Last name cannot be empty",
                });
                return;
            }
            if (value.length < 2 || value.length > 50) {
                res.status(400).json({
                    success: false,
                    message: "Last name must be between 2 and 50 characters",
                });
                return;
            }
            user.lastName = value;
        }
        if (dateOfBirth !== undefined) {
            const value = String(dateOfBirth).trim();
            if (!value) {
                res.status(400).json({
                    success: false,
                    message: "Date of birth cannot be empty",
                });
                return;
            }
            const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dobRegex.test(value)) {
                res.status(400).json({
                    success: false,
                    message: "Date of birth must be in YYYY-MM-DD format",
                });
                return;
            }
            const dob = new Date(`${value}T00:00:00`);
            if (Number.isNaN(dob.getTime())) {
                res.status(400).json({
                    success: false,
                    message: "Invalid date of birth",
                });
                return;
            }
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            if (dob > today) {
                res.status(400).json({
                    success: false,
                    message: "Date of birth cannot be in the future",
                });
                return;
            }
            const minimumYear = new Date().getFullYear() - 100;
            if (dob.getFullYear() < minimumYear) {
                res.status(400).json({
                    success: false,
                    message: "Invalid date of birth",
                });
                return;
            }
            user.dateOfBirth = dob;
        }
        if (shouldRemoveProfilePhoto && !profilePhoto) {
            if (user.profilePhotoPublicId) {
                try {
                    await cloudinary.uploader.destroy(user.profilePhotoPublicId);
                }
                catch (deleteError) {
                    console.error("Failed to delete profile photo from Cloudinary:", deleteError);
                }
            }
            user.set("profilePhoto", undefined);
            user.set("profilePhotoPublicId", undefined);
        }
        if (profilePhoto) {
            if (!profilePhoto.mimetype.startsWith("image/")) {
                res.status(400).json({
                    success: false,
                    message: "Only image files are allowed",
                });
                return;
            }
            if (profilePhoto.size > 5 * 1024 * 1024) {
                res.status(400).json({
                    success: false,
                    message: "Profile photo must be 5MB or smaller",
                });
                return;
            }
            const uploadResult = await new Promise<{
                secure_url: string;
                public_id: string;
            }>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({
                    folder: "mindmatrix/profile-photos",
                    resource_type: "image",
                    transformation: [
                        {
                            width: 500,
                            height: 500,
                            crop: "fill",
                            gravity: "face",
                        },
                    ],
                }, (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    if (!result) {
                        return reject(new Error("Cloudinary upload failed"));
                    }
                    resolve({
                        secure_url: result.secure_url,
                        public_id: result.public_id,
                    });
                });
                uploadStream.end(profilePhoto.buffer);
            });
            if (user.profilePhotoPublicId) {
                try {
                    await cloudinary.uploader.destroy(user.profilePhotoPublicId);
                }
                catch (deleteError) {
                    console.error("Failed to delete old profile photo:", deleteError);
                }
            }
            user.profilePhoto = uploadResult.secure_url;
            user.profilePhotoPublicId = uploadResult.public_id;
        }
        await user.save();
        const updatedUser = await User.findById(userId).select("-password -emailOtp -phoneOtp -resetPasswordOtp");
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser,
        });
    }
    catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

export const getLoginEncryptionKey = async (_req: Request, res: Response): Promise<void> => {
    try {
        const sessionKey = generateEphemeralSessionKey(5 * 60 * 1000); // 5 minutes TTL
        res.cookie("loginKeyId", sessionKey.keyId, {
            ...getAuthCookieOptions(),
            maxAge: 5 * 60 * 1000,
        });
        res.status(200).json({
            success: true,
            data: {
                keyId: sessionKey.keyId,
                key: sessionKey.key,
                algorithm: "AES-GCM-256",
                expiresAt: sessionKey.expiresAt,
            },
        });
    } catch (error) {
        console.error("Failed to generate login encryption key:", error);
        res.status(500).json({
            success: false,
            message: "Failed to initialize login encryption session",
        });
    }
};

// =====================================================
// UPLOAD COVER IMAGE
// =====================================================

export const uploadCoverImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }

        const coverImage = req.file;
        if (!coverImage) {
            res.status(400).json({
                success: false,
                message: "Please select an image to upload as cover",
            });
            return;
        }

        if (!coverImage.mimetype.startsWith("image/")) {
            res.status(400).json({
                success: false,
                message: "Only image files (JPG, PNG, WebP) are allowed",
            });
            return;
        }

        if (coverImage.size > 5 * 1024 * 1024) {
            res.status(400).json({
                success: false,
                message: "Cover image must be 5MB or smaller",
            });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }

        const uploadResult = await new Promise<{
            secure_url: string;
            public_id: string;
        }>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "mindmatrix/cover-images",
                    resource_type: "image",
                },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) return reject(new Error("Cloudinary upload failed"));
                    resolve({
                        secure_url: result.secure_url,
                        public_id: result.public_id,
                    });
                }
            );
            uploadStream.end(coverImage.buffer);
        });

        // Delete previous cover image from Cloudinary if existed
        if (user.coverImagePublicId) {
            try {
                await cloudinary.uploader.destroy(user.coverImagePublicId);
            } catch (deleteError) {
                console.error("Failed to delete old cover image from Cloudinary:", deleteError);
            }
        }

        user.coverImage = uploadResult.secure_url;
        user.coverImagePublicId = uploadResult.public_id;
        await user.save();

        const updatedUser = await User.findById(userId).select(
            "-password -emailOtp -phoneOtp -resetPasswordOtp -profilePhotoPublicId -coverImagePublicId"
        );

        auditLog("SETTINGS_UPDATED", "SUCCESS", req, {
            userId: user._id?.toString(),
            userEmail: user.email,
            userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            role: user.role,
            details: { action: "Cover image uploaded" },
        });

        res.status(200).json({
            success: true,
            message: "Cover image updated successfully",
            data: {
                coverImage: uploadResult.secure_url,
                user: updatedUser,
            },
        });
    } catch (error: any) {
        console.error("Upload cover image error:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Failed to upload cover image",
        });
    }
};

// =====================================================
// REMOVE COVER IMAGE
// =====================================================

export const removeCoverImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }

        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }

        if (user.coverImagePublicId) {
            try {
                await cloudinary.uploader.destroy(user.coverImagePublicId);
            } catch (deleteError) {
                console.error("Failed to delete cover image from Cloudinary:", deleteError);
            }
        }

        user.set("coverImage", undefined);
        user.set("coverImagePublicId", undefined);
        await user.save();

        const updatedUser = await User.findById(userId).select(
            "-password -emailOtp -phoneOtp -resetPasswordOtp -profilePhotoPublicId -coverImagePublicId"
        );

        auditLog("SETTINGS_UPDATED", "SUCCESS", req, {
            userId: user._id?.toString(),
            userEmail: user.email,
            userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            role: user.role,
            details: { action: "Cover image removed" },
        });

        res.status(200).json({
            success: true,
            message: "Cover image removed successfully",
            data: {
                coverImage: null,
                user: updatedUser,
            },
        });
    } catch (error: any) {
        console.error("Remove cover image error:", error);
        res.status(500).json({
            success: false,
            message: error?.message || "Failed to remove cover image",
        });
    }
};

