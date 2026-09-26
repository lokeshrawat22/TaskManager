import mongoose, {
  Document,
  Schema,
  Types,
} from "mongoose";

// =====================================================
// TASK INTERFACE
// =====================================================

export interface ITask extends Document {
  title: string;
  description: string;

  createdBy: Types.ObjectId;
  assignedTo: Types.ObjectId;

  status:
    | "PENDING"
    | "IN_PROGRESS"
    | "COMPLETED";

  priority:
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "URGENT";

  dueDate: Date;

  completedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// TASK SCHEMA
// =====================================================

const taskSchema = new Schema<ITask>(
  {
    // =================================================
    // TITLE
    // =================================================

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },

    // =================================================
    // DESCRIPTION
    // =================================================

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    // =================================================
    // CREATED BY
    // =================================================

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =================================================
    // ASSIGNED TO
    // =================================================

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // =================================================
    // STATUS
    // =================================================

    status: {
      type: String,
      enum: [
        "PENDING",
        "IN_PROGRESS",
        "COMPLETED",
      ],
      default: "PENDING",
      index: true,
    },

    // =================================================
    // PRIORITY
    // =================================================

    priority: {
      type: String,
      enum: [
        "LOW",
        "MEDIUM",
        "HIGH",
        "URGENT",
      ],
      default: "MEDIUM",
      index: true,
    },

    // =================================================
    // DUE DATE
    // =================================================

    dueDate: {
      type: Date,
      required: true,
      index: true,
    },

    // =================================================
    // COMPLETED AT
    // =================================================

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =====================================================
// INDEXES
// =====================================================

taskSchema.index({
  assignedTo: 1,
  status: 1,
});

taskSchema.index({
  createdBy: 1,
  createdAt: -1,
});

taskSchema.index({
  dueDate: 1,
  status: 1,
});

// =====================================================
// MODEL
// =====================================================

const Task = mongoose.model<ITask>(
  "Task",
  taskSchema
);

export default Task;