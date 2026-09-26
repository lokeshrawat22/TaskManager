import mongoose, {
  Document,
  Schema,
  Types,
} from "mongoose";

// =====================================================
// NOTIFICATION TYPE
// =====================================================

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "TASK_COMPLETED"
  | "TASK_OVERDUE"
  | "TASK_DEADLINE"
  | "ACCOUNT_BLOCKED"
  | "ACCOUNT_UNBLOCKED"
  | "EMPLOYEE_CREATED"
  | "EMPLOYEE_UPDATED"
  | "SYSTEM_ANNOUNCEMENT";

// =====================================================
// NOTIFICATION INTERFACE
// =====================================================

export interface INotification extends Document {
  recipient: Types.ObjectId;
  recipientId?: Types.ObjectId;
  recipientRole: "super_admin" | "administrator" | "admin" | "employee" | "user";
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: "task" | "user" | "system";
  relatedEntityId?: Types.ObjectId | null;
  taskId?: Types.ObjectId | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// NOTIFICATION SCHEMA
// =====================================================

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: ["super_admin", "administrator", "admin", "employee", "user"],
      default: "employee",
      index: true,
    },
    type: {
      type: String,
      enum: [
        "TASK_ASSIGNED",
        "TASK_UPDATED",
        "TASK_COMPLETED",
        "TASK_OVERDUE",
        "TASK_DEADLINE",
        "ACCOUNT_BLOCKED",
        "ACCOUNT_UNBLOCKED",
        "EMPLOYEE_CREATED",
        "EMPLOYEE_UPDATED",
        "SYSTEM_ANNOUNCEMENT",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    relatedEntityType: {
      type: String,
      enum: ["task", "user", "system"],
      default: "task",
    },
    relatedEntityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// =====================================================
// COMPOUND INDEXES
// =====================================================

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

// =====================================================
// MODEL
// =====================================================

const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);

export default Notification;
