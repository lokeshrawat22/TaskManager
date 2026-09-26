import { Router } from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// =====================================================
// GET /api/notifications
// =====================================================
router.get("/", getNotifications);

// =====================================================
// GET /api/notifications/unread-count
// =====================================================
router.get("/unread-count", getUnreadCount);

// =====================================================
// PATCH /api/notifications/read-all
// =====================================================
router.patch("/read-all", markAllAsRead);

// =====================================================
// PATCH /api/notifications/:id/read
// =====================================================
router.patch("/:id/read", markAsRead);

// =====================================================
// DELETE /api/notifications/:id
// =====================================================
router.delete("/:id", deleteNotification);

export default router;
