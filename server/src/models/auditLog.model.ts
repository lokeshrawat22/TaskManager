import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAuditLog extends Document {
  timestamp: Date;
  eventType: string;
  status: "SUCCESS" | "FAILURE" | "DENIED" | "BLOCKED";
  userId?: Types.ObjectId;
  userEmail?: string;
  userName?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE", "DENIED", "BLOCKED"],
      default: "SUCCESS",
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    userEmail: {
      type: String,
      trim: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
      index: true,
    },
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    endpoint: {
      type: String,
      trim: true,
    },
    method: {
      type: String,
      trim: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });

const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

export { AuditLog };
export default AuditLog;
