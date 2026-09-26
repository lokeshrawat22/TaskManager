import {
  Request,
  Response,
  NextFunction,
} from "express";

import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { getAuthCookieOptions } from "../utils/jwt.js";

// =====================================================
// JWT PAYLOAD
// =====================================================

export interface JwtPayload {
  userId: string;
  sub?: string;
  role: "super_admin" | "administrator" | "admin" | "employee" | "user";
  email?: string;
  name?: string;
  type?: "access" | "refresh";
}

// =====================================================
// AUTHENTICATE
// =====================================================

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // =================================================
    // GET ACCESS TOKEN
    // =================================================

    const token = req.cookies?.accessToken;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token is missing.",
      });

      return;
    }

    // =================================================
    // CHECK SECRET
    // =================================================

    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      console.error(
        "JWT_ACCESS_SECRET is missing from environment"
      );

      res.status(500).json({
        success: false,
        message: "JWT access secret is not configured.",
      });

      return;
    }

    // =================================================
    // VERIFY TOKEN
    // =================================================

    const decoded = jwt.verify(
      token,
      secret
    ) as JwtPayload;

    const tokenUserId = decoded.userId || decoded.sub;

    if (!tokenUserId) {
      res.status(401).json({
        success: false,
        message: "Invalid token payload.",
      });
      return;
    }

    // =================================================
    // GET CURRENT USER FROM DATABASE & ENFORCE IS_BLOCKED
    // =================================================

    const user = await User.findById(
      tokenUserId
    ).select("_id role isBlocked email firstName lastName");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found.",
      });

      return;
    }

    // =================================================
    // AUTHORITATIVE BLOCKED USER CHECK
    // =================================================

    if (user.isBlocked) {
      const cookieOpts = getAuthCookieOptions();
      res.clearCookie("accessToken", cookieOpts);
      res.clearCookie("refreshToken", cookieOpts);

      res.status(403).json({
        success: false,
        code: "ACCOUNT_BLOCKED",
        message:
          "Your account has been blocked by the administrator.",
      });

      return;
    }

    // =================================================
    // ATTACH USER TO REQUEST
    // =================================================

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    req.user = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      name: fullName || undefined,
    };

    next();

  } catch (error: any) {
    // Routine token expiration or invalidation should fail cleanly without polluting server logs
    res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }
};