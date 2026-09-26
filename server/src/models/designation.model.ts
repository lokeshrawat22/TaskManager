import mongoose, { Document, Schema, Types } from "mongoose";
import { normalizeMasterDataName, toLookupKey } from "../utils/masterData.validation.js";

export interface IDesignation extends Document {
  name: string;
  normalizedName: string;
  department?: Types.ObjectId | null;
  departmentName?: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const designationSchema = new Schema<IDesignation>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },
    departmentName: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook to auto-populate normalizedName and normalize name
designationSchema.pre("validate", function () {
  if (this.name) {
    this.name = normalizeMasterDataName(this.name);
    this.normalizedName = toLookupKey(this.name);
  }
});

const Designation = mongoose.model<IDesignation>("Designation", designationSchema);

export default Designation;
