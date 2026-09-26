import {
  Request,
  Response,
  NextFunction,
} from "express";

import { AppError } from "../utils/AppError.js";

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
 if (!(error instanceof AppError)) {
  console.error("Backend Error:", error);
}

  // =====================================================
  // CUSTOM APPLICATION ERROR
  // =====================================================

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.errors && {
        errors: error.errors,
      }),
    });

    return;
  }

  // =====================================================
  // MULTER FILE UPLOAD ERROR
  // =====================================================

  if (error?.name === "MulterError" || error?.code === "LIMIT_FILE_SIZE") {
    if (error?.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        message: "File size exceeds the 5MB limit. Please choose a smaller image.",
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: error?.message || "File upload error.",
    });
    return;
  }

  // =====================================================
  // MONGOOSE DUPLICATE KEY ERROR
  // =====================================================

  if (error?.code === 11000) {
    const keyPattern = error.keyPattern || {};
    const field = Object.keys(keyPattern)[0];
    const errMsg = String(error.message || "");

    if (errMsg.includes("departments") || errMsg.includes("Department")) {
      res.status(409).json({
        success: false,
        code: "DUPLICATE_DEPARTMENT",
        message: "Department already exists.",
      });
      return;
    }

    if (errMsg.includes("designations") || errMsg.includes("Designation")) {
      res.status(409).json({
        success: false,
        code: "DUPLICATE_DESIGNATION",
        message: "Designation already exists.",
      });
      return;
    }

    const message =
      field === "email"
        ? "This email is already registered."
        : field === "phone"
        ? "This phone number is already registered."
        : "This value is already registered.";

    res.status(409).json({
      success: false,
      message: "Registration failed",
      errors: {
        [field || "field"]: message,
      },
    });

    return;
  }

  // =====================================================
  // UNKNOWN SERVER ERROR
  // =====================================================

  res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again.",
  });
};