import { Request, Response } from "express";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import Task from "../models/task.model.js";
import User from "../models/user.model.js";

// =====================================================
// HELPERS
// =====================================================

const isValidId = (id: unknown): id is string =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

const isSuperAdmin = (req: Request) => req.user?.role === "super_admin";

/**
 * Super Admin can view admin-level notifications in addition to
 * notifications addressed directly to the Super Admin.
 * Normal users continue to see only their own notifications.
 */
const getNotificationRecipientIds = async (req: Request): Promise<string[]> => {
  const userId = req.user?.userId;
  if (!userId) return [];

  if (!isSuperAdmin(req)) {
    return [userId];
  }

  const adminUsers = await User.find({
    role: { $in: ["administrator", "admin"] },
  })
    .select("_id")
    .lean();

  return [userId, ...adminUsers.map((user: any) => String(user._id))];
};

/**
 * Check for overdue tasks and upcoming deadlines for the user.
 * Ensures no duplicate notifications are created for the same event.
 */
export const syncDeadlinesAndOverdue = async (
  userId: string,
): Promise<void> => {
  try {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const overdueTasks = await Task.find({
      assignedTo: userId,
      status: { $in: ["PENDING", "IN_PROGRESS"] },
      dueDate: { $lt: now },
    }).select("_id title");

    for (const task of overdueTasks) {
      const exists = await Notification.exists({
        recipient: userId,
        taskId: task._id,
        type: "TASK_OVERDUE",
      });

      if (!exists) {
        await Notification.create({
          recipient: userId,
          type: "TASK_OVERDUE",
          title: "Task Overdue",
          message: `Your task "${task.title}" is past its deadline.`,
          taskId: task._id,
        });
      }
    }

    const upcomingTasks = await Task.find({
      assignedTo: userId,
      status: { $in: ["PENDING", "IN_PROGRESS"] },
      dueDate: { $gte: now, $lte: next24h },
    }).select("_id title");

    for (const task of upcomingTasks) {
      const exists = await Notification.exists({
        recipient: userId,
        taskId: task._id,
        type: "TASK_DEADLINE",
      });

      if (!exists) {
        await Notification.create({
          recipient: userId,
          type: "TASK_DEADLINE",
          title: "Task Deadline Approaching",
          message: `The deadline for task "${task.title}" is approaching within 24 hours.`,
          taskId: task._id,
        });
      }
    }
  } catch (err) {
    console.error("syncDeadlinesAndOverdue error:", err);
  }
};

// =====================================================
// GET NOTIFICATIONS
// GET /api/notifications
// =====================================================

export const getNotifications = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Only sync personal task deadlines. Admin notifications are handled
    // separately and should not be generated from Super Admin's own tasks.
    await syncDeadlinesAndOverdue(userId);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const recipientIds = await getNotificationRecipientIds(req);

    const filterQuery: Record<string, any> = {
      recipient: { $in: recipientIds },
    };

    const filterParam = String(
      req.query.filter || req.query.status || "all",
    ).toLowerCase();

    if (filterParam === "unread") {
      filterQuery.isRead = false;
    } else if (filterParam === "read") {
      filterQuery.isRead = true;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filterQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filterQuery),
      Notification.countDocuments({
        recipient: { $in: recipientIds },
        isRead: false,
      }),
    ]);

    const mappedNotifications = notifications.map((n: any) => ({
      ...n,
      id: n._id.toString(),
      recipientId: n.recipient?.toString() || userId,
      relatedEntityId:
        n.relatedEntityId?.toString() || n.taskId?.toString() || null,
      relatedEntityType: n.relatedEntityType || "task",
    }));

    res.status(200).json({
      success: true,
      data: {
        notifications: mappedNotifications,
        unreadCount,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("getNotifications error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================================
// GET UNREAD COUNT
// GET /api/notifications/unread-count
// =====================================================

export const getUnreadCount = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    await syncDeadlinesAndOverdue(userId);

    const recipientIds = await getNotificationRecipientIds(req);

    const count = await Notification.countDocuments({
      recipient: { $in: recipientIds },
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error("getUnreadCount error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================================
// MARK AS READ
// PATCH /api/notifications/:id/read
// =====================================================

export const markAsRead = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!isValidId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
      return;
    }

    const recipientIds = await getNotificationRecipientIds(req);

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        recipient: { $in: recipientIds },
      },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: { notification },
    });
  } catch (error) {
    console.error("markAsRead error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================================
// MARK ALL AS READ
// PATCH /api/notifications/read-all
// =====================================================

export const markAllAsRead = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const recipientIds = await getNotificationRecipientIds(req);

    await Notification.updateMany(
      {
        recipient: { $in: recipientIds },
        isRead: false,
      },
      { isRead: true },
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("markAllAsRead error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// =====================================================
// DELETE NOTIFICATION
// DELETE /api/notifications/:id
// =====================================================

export const deleteNotification = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!isValidId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
      return;
    }

    const recipientIds = await getNotificationRecipientIds(req);

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: { $in: recipientIds },
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("deleteNotification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
