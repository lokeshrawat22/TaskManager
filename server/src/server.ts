import mongoose from "mongoose";
import dns from "node:dns";
import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";
import User from "./models/user.model.js";
import Notification from "./models/notification.model.js";
import { seedMasterData } from "./utils/seedMasterData.js";

// Fix Node DNS resolution for MongoDB Atlas SRV
// dns.setServers(["8.8.8.8", "8.8.4.4"]);

const PORT: number = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    // Migrate existing "user" roles to "employee"
    try {
      const userMigrationResult = await User.updateMany(
        { role: "user" },
        { $set: { role: "employee" } }
      );
      if (userMigrationResult.modifiedCount > 0) {
        console.log(`Migrated ${userMigrationResult.modifiedCount} user records to employee role.`);
      }

      const notifMigrationResult = await Notification.updateMany(
        { recipientRole: "user" },
        { $set: { recipientRole: "employee" } }
      );
      if (notifMigrationResult.modifiedCount > 0) {
        console.log(`Migrated ${notifMigrationResult.modifiedCount} notification records to employee recipientRole.`);
      }

      // Cleanup: Permanently remove legacy rememberMe field from ALL existing User documents
      const rememberMeCleanupResult = await User.updateMany(
        { rememberMe: { $exists: true } },
        { $unset: { rememberMe: "" } }
      );
      if (rememberMeCleanupResult.modifiedCount > 0) {
        console.log(`[Migration] Unset legacy rememberMe field from ${rememberMeCleanupResult.modifiedCount} User documents.`);
      }

      // Cleanup: Permanently remove legacy refreshTokens and refreshToken fields from ALL existing User documents
      const tokenCleanupResult = await mongoose.connection.collection("users").updateMany(
        {
          $or: [
            { refreshTokens: { $exists: true } },
            { refreshToken: { $exists: true } },
          ],
        },
        {
          $unset: {
            refreshTokens: "",
            refreshToken: "",
          },
        }
      );
      if (tokenCleanupResult.modifiedCount > 0) {
        console.log(`[Migration] Unset legacy refreshTokens and refreshToken fields from ${tokenCleanupResult.modifiedCount} User documents.`);
      }

      // Cleanup: Drop legacy sessions collection if it exists
      try {
        await mongoose.connection.collection("sessions").drop();
        console.log("[Migration] Dropped legacy sessions collection.");
      } catch {
        // sessions collection might not exist, safe to ignore
      }

      // Ensure at least one Super Admin exists
      const superAdminCount = await User.countDocuments({ role: "super_admin" });
      if (superAdminCount === 0) {
        // Find existing admin to promote
        const adminToPromote = await User.findOne({
          role: { $in: ["admin", "administrator"] },
        }).sort({ createdAt: 1 });

        if (adminToPromote) {
          adminToPromote.role = "super_admin";
          await adminToPromote.save();
          console.log(`[RBAC] Promoted primary administrator (${adminToPromote.email}) to Super Administrator.`);
        }
      }

      // Seed Department and Designation master data
      await seedMasterData();

      // Startup and periodic cleanup for expired OTP records across MongoDB
      const purgeExpiredOtps = async () => {
        try {
          const now = new Date();
          await Promise.all([
            User.updateMany(
              { emailOtpExpiresAt: { $lt: now } },
              { $unset: { emailOtp: "", emailOtpExpiresAt: "", emailOtpResendAvailableAt: "" } }
            ),
            User.updateMany(
              { phoneOtpExpiresAt: { $lt: now } },
              { $unset: { phoneOtp: "", phoneOtpExpiresAt: "", phoneOtpResendAvailableAt: "" } }
            ),
            User.updateMany(
              { resetPasswordOtpExpiresAt: { $lt: now } },
              { $unset: { resetPasswordOtp: "", resetPasswordOtpExpiresAt: "", resetPasswordOtpResendAvailableAt: "" } }
            ),
          ]);
        } catch (cleanupErr) {
          console.error("Expired OTP cleanup error (non-fatal):", cleanupErr);
        }
      };

      await purgeExpiredOtps();
      setInterval(purgeExpiredOtps, 30 * 60 * 1000).unref();
    } catch (migErr) {
      console.error("Migration/Seeding error (non-fatal):", migErr);
    }

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();