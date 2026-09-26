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

    const hasAccessToken = Boolean(req.cookies?.accessToken);
    if (!hasAccessToken) {
      console.log("[AUTH-DIAG] Authenticate check: Access token cookie is missing (401)");
      res.status(401).json({
        success: false,
        message: "Access token is missing.",
      });

      return;
    }

    const token = req.cookies?.accessToken;

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
      console.log("[AUTH-DIAG] Authenticate check: Invalid token payload (401)");
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
      console.log(`[AUTH-DIAG] Authenticate check: User ${tokenUserId} not found (401)`);
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
      console.log(`[AUTH-DIAG] Authenticate check: User ${tokenUserId} is blocked (403)`);
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

    console.log(`[AUTH-DIAG] Authenticate check: Succeeded for user ${user._id}`);
    next();

  } catch (error: any) {
    console.log("[AUTH-DIAG] Authenticate check: Invalid or expired access token (401)");
    res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }
};