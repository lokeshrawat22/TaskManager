import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Department from "../models/department.model.js";
import Designation from "../models/designation.model.js";
import User from "../models/user.model.js";
import {
  validateMasterDataName,
  normalizeMasterDataName,
  toLookupKey,
} from "../utils/masterData.validation.js";

// =====================================================
// DEPARTMENTS CONTROLLER
// =====================================================

/**
 * GET /api/admin/departments/check-name
 * Validate department name & check uniqueness
 */
export const checkDepartmentName = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, excludeId } = req.query;
    const rawName = typeof name === "string" ? name : "";

    const validation = validateMasterDataName(rawName, "department");
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        code: "INVALID_DEPARTMENT_NAME",
        validationCode: validation.code,
        message: validation.message,
        normalized: validation.normalized,
      });
      return;
    }

    const lookupKey = toLookupKey(validation.normalized);
    const query: Record<string, any> = {
      normalizedName: lookupKey,
    };

    if (
      typeof excludeId === "string" &&
      mongoose.Types.ObjectId.isValid(excludeId)
    ) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const existing = await Department.findOne(query).lean();
    if (existing) {
      const isArchived = existing.status === "INACTIVE";
      res.status(200).json({
        success: true,
        available: false,
        code: "DUPLICATE_DEPARTMENT",
        isArchived,
        message: isArchived
          ? "Department with this name already exists, including archived records."
          : "Department already exists.",
        normalized: validation.normalized,
      });
      return;
    }

    res.status(200).json({
      success: true,
      available: true,
      normalized: validation.normalized,
      message: "Valid department name",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/departments
 * Fetch all departments with dynamic employee and designation counts
 */
export const getDepartments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, search } = req.query;

    const filter: Record<string, any> = {};
    if (status && (status === "ACTIVE" || status === "INACTIVE")) {
      filter.status = status;
    }

    if (typeof search === "string" && search.trim()) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    const departments = await Department.find(filter).sort({ name: 1 }).lean();

    // Aggregate employee counts per department dynamically
    const employeeCounts = await User.aggregate([
      {
        $group: {
          _id: { $toLower: "$department" },
          count: { $sum: 1 },
        },
      },
    ]);

    const empCountMap = new Map<string, number>();
    employeeCounts.forEach((item) => {
      if (item._id) {
        empCountMap.set(String(item._id).trim(), item.count);
      }
    });

    // Aggregate designation counts per department dynamically
    const designationCounts = await Designation.aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
        },
      },
    ]);

    const desigCountMap = new Map<string, number>();
    designationCounts.forEach((item) => {
      if (item._id) {
        desigCountMap.set(String(item._id), item.count);
      }
    });

    const enriched = departments.map((dept) => {
      const lowerName = dept.name.toLowerCase().trim();
      const employeeCount = empCountMap.get(lowerName) || 0;
      const designationCount = desigCountMap.get(String(dept._id)) || 0;

      return {
        ...dept,
        employeeCount,
        designationCount,
      };
    });

    res.status(200).json({
      success: true,
      data: enriched,
      total: enriched.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/departments/:id
 * Get single department by ID
 */
export const getDepartmentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
      return;
    }

    const department = await Department.findById(id).lean();

    if (!department) {
      res.status(404).json({
        success: false,
        message: "Department not found",
      });
      return;
    }

    const employeeCount = await User.countDocuments({
      $or: [
        { departmentId: department._id },
        { department: { $regex: new RegExp(`^${department.name}$`, "i") } },
      ],
    });

    const designations = await Designation.find({
      department: department._id,
      status: "ACTIVE",
    })
      .select("name description status")
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...department,
        employeeCount,
        designationCount: designations.length,
        designations,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/departments
 * Create new department with strict validation and duplicate protection
 */
export const createDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, description, status } = req.body;

    const validation = validateMasterDataName(name, "department");
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        code: "INVALID_DEPARTMENT_NAME",
        validationCode: validation.code,
        message: validation.message,
      });
      return;
    }

    const normalizedName = validation.normalized;
    const lookupKey = toLookupKey(normalizedName);

    // Case-insensitive duplicate check using normalizedName
    const existing = await Department.findOne({
      normalizedName: lookupKey,
    });

    if (existing) {
      const isArchived = existing.status === "INACTIVE";
      res.status(409).json({
        success: false,
        code: "DUPLICATE_DEPARTMENT",
        isArchived,
        message: isArchived
          ? "Department with this name already exists, including archived records."
          : "Department already exists.",
      });
      return;
    }

    const department: any = await Department.create({
      name: normalizedName,
      normalizedName: lookupKey,
      description: typeof description === "string" ? description.trim() : "",
      status: status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      createdBy: req.user?.userId
        ? new mongoose.Types.ObjectId(req.user.userId)
        : undefined,
    });

    res.status(201).json({
      success: true,
      message: `Department "${department.name}" created successfully.`,
      data: {
        ...department.toObject(),
        employeeCount: 0,
        designationCount: 0,
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({
        success: false,
        code: "DUPLICATE_DEPARTMENT",
        message: "Department already exists.",
      });
      return;
    }
    next(error);
  }
};

/**
 * PATCH /api/admin/departments/:id
 * Update department details or status with duplicate and format checks
 */
export const updateDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, description, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
      return;
    }

    const department = await Department.findById(id);
    if (!department) {
      res.status(404).json({
        success: false,
        message: "Department not found",
      });
      return;
    }

    const oldName = department.name;

    if (name !== undefined) {
      const validation = validateMasterDataName(name, "department");
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          code: "INVALID_DEPARTMENT_NAME",
          validationCode: validation.code,
          message: validation.message,
        });
        return;
      }

      const normalizedName = validation.normalized;
      const lookupKey = toLookupKey(normalizedName);

      // Check duplicate excluding self
      const existing = await Department.findOne({
        _id: { $ne: department._id },
        normalizedName: lookupKey,
      });

      if (existing) {
        const isArchived = existing.status === "INACTIVE";
        res.status(409).json({
          success: false,
          code: "DUPLICATE_DEPARTMENT",
          isArchived,
          message: isArchived
            ? "Department with this name already exists, including archived records."
            : "Department already exists.",
        });
        return;
      }

      department.name = normalizedName;
      department.normalizedName = lookupKey;
    }

    if (description !== undefined) {
      department.description =
        typeof description === "string" ? description.trim() : "";
    }

    if (status !== undefined) {
      if (status !== "ACTIVE" && status !== "INACTIVE") {
        res.status(400).json({
          success: false,
          message: "Invalid status. Must be 'ACTIVE' or 'INACTIVE'.",
        });
        return;
      }
      department.status = status;
    }

    await department.save();

    // If department name was changed, synchronize users and designations
    if (department.name !== oldName) {
      await Promise.all([
        User.updateMany(
          { department: oldName },
          {
            $set: { department: department.name, departmentId: department._id },
          },
        ),
        Designation.updateMany(
          { department: department._id },
          { $set: { departmentName: department.name } },
        ),
      ]);
    }

    res.status(200).json({
      success: true,
      message: `Department "${department.name}" updated successfully.`,
      data: department,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({
        success: false,
        code: "DUPLICATE_DEPARTMENT",
        message: "Department already exists.",
      });
      return;
    }
    next(error);
  }
};

/**
 * DELETE /api/admin/departments/:id
 * Delete or archive department with safe dependency protection
 */
export const deleteDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { action } = req.query; // 'archive' or 'force'

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
      return;
    }

    const department = await Department.findById(id);
    if (!department) {
      res.status(404).json({
        success: false,
        message: "Department not found",
      });
      return;
    }

    // Check employee dependency
    const assignedEmployeesCount = await User.countDocuments({
      $or: [
        { departmentId: department._id },
        { department: { $regex: new RegExp(`^${department.name}$`, "i") } },
      ],
    });

    // Check designation dependency
    const designationCount = await Designation.countDocuments({
      department: department._id,
    });

    // If archive action requested, safely deactivate
    if (action === "archive") {
      department.status = "INACTIVE";
      await department.save();

      res.status(200).json({
        success: true,
        message: `Department "${department.name}" has been deactivated/archived.`,
        data: department,
      });
      return;
    }

    // If employees are assigned, block destructive deletion
    if (assignedEmployeesCount > 0) {
      res.status(400).json({
        success: false,
        code: "DEPARTMENT_HAS_DEPENDENCIES",
        message: `Cannot delete department "${department.name}" because ${assignedEmployeesCount} employee(s) are currently assigned to it. Please reassign the employees or deactivate the department instead.`,
        employeeCount: assignedEmployeesCount,
      });
      return;
    }

    // Safe deletion: delete department and unlink designations
    await Designation.updateMany(
      { department: department._id },
      { $set: { department: null, departmentName: "" } },
    );

    await Department.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Department "${department.name}" deleted successfully.`,
      deletedId: id,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// DESIGNATIONS CONTROLLER
// =====================================================

/**
 * GET /api/admin/designations
 * Fetch all designations with department info and employee counts
 */
export const getDesignations = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { department, status, search } = req.query;

    const filter: Record<string, any> = {};

    if (status && (status === "ACTIVE" || status === "INACTIVE")) {
      filter.status = status;
    }

    if (typeof search === "string" && search.trim()) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    if (
      typeof department === "string" &&
      department.trim() &&
      department !== "ALL"
    ) {
      if (mongoose.Types.ObjectId.isValid(department)) {
        filter.department = new mongoose.Types.ObjectId(department);
      } else {
        // Look up department by name
        const deptDoc = await Department.findOne({
          name: { $regex: new RegExp(`^${department.trim()}$`, "i") },
        });
        if (deptDoc) {
          filter.$or = [
            { department: deptDoc._id },
            {
              departmentName: {
                $regex: new RegExp(`^${department.trim()}$`, "i"),
              },
            },
          ];
        } else {
          filter.departmentName = {
            $regex: new RegExp(`^${department.trim()}$`, "i"),
          };
        }
      }
    }

    const designations = await Designation.find(filter)
      .populate("department", "name status")
      .sort({ departmentName: 1, name: 1 })
      .lean();

    // Aggregate employee counts per designation
    const employeeCounts = await User.aggregate([
      {
        $group: {
          _id: { $toLower: "$designation" },
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map<string, number>();
    employeeCounts.forEach((item) => {
      if (item._id) {
        countMap.set(String(item._id).trim(), item.count);
      }
    });

    const enriched = designations.map((desig) => {
      const lowerName = desig.name.toLowerCase().trim();
      const employeeCount = countMap.get(lowerName) || 0;

      return {
        ...desig,
        employeeCount,
      };
    });

    res.status(200).json({
      success: true,
      data: enriched,
      total: enriched.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/designations/:id
 * Get single designation by ID
 */
export const getDesignationById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid designation ID",
      });
      return;
    }

    const designation = await Designation.findById(id)
      .populate("department", "name status")
      .lean();

    if (!designation) {
      res.status(404).json({
        success: false,
        message: "Designation not found",
      });
      return;
    }

    const employeeCount = await User.countDocuments({
      $or: [
        { designationId: designation._id },
        { designation: { $regex: new RegExp(`^${designation.name}$`, "i") } },
      ],
    });

    res.status(200).json({
      success: true,
      data: {
        ...designation,
        employeeCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/designations/check-name
 * Validate designation name & check uniqueness
 */
export const checkDesignationName = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, excludeId } = req.query;
    const rawName = typeof name === "string" ? name : "";

    const validation = validateMasterDataName(rawName, "designation");
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        code: "INVALID_DESIGNATION_NAME",
        validationCode: validation.code,
        message: validation.message,
        normalized: validation.normalized,
      });
      return;
    }

    const lookupKey = toLookupKey(validation.normalized);
    const query: Record<string, any> = {
      normalizedName: lookupKey,
    };

    if (
      typeof excludeId === "string" &&
      mongoose.Types.ObjectId.isValid(excludeId)
    ) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const existing = await Designation.findOne(query).lean();
    if (existing) {
      const isArchived = existing.status === "INACTIVE";
      res.status(200).json({
        success: true,
        available: false,
        code: "DUPLICATE_DESIGNATION",
        isArchived,
        message: isArchived
          ? "Designation with this name already exists, including archived records."
          : "Designation already exists.",
        normalized: validation.normalized,
      });
      return;
    }

    res.status(200).json({
      success: true,
      available: true,
      normalized: validation.normalized,
      message: "Valid designation name",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/designations
 * Create new designation with strict validation and duplicate protection
 */
export const createDesignation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, department, description, status } = req.body;

    const validation = validateMasterDataName(name, "designation");
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        code: "INVALID_DESIGNATION_NAME",
        validationCode: validation.code,
        message: validation.message,
      });
      return;
    }

    const normalizedName = validation.normalized;
    const lookupKey = toLookupKey(normalizedName);

    let departmentId: mongoose.Types.ObjectId | null = null;
    let departmentName = "";

    if (department) {
      let deptDoc = null;
      if (mongoose.Types.ObjectId.isValid(department)) {
        deptDoc = await Department.findById(department);
      } else if (typeof department === "string" && department.trim()) {
        deptDoc = await Department.findOne({
          normalizedName: toLookupKey(normalizeMasterDataName(department)),
        });
      }

      if (deptDoc) {
        departmentId = deptDoc._id as mongoose.Types.ObjectId;
        departmentName = deptDoc.name;
      }
    }

    // Check duplicate designation using normalizedName
    const existing = await Designation.findOne({
      normalizedName: lookupKey,
    });

    if (existing) {
      const isArchived = existing.status === "INACTIVE";
      res.status(409).json({
        success: false,
        code: "DUPLICATE_DESIGNATION",
        isArchived,
        message: isArchived
          ? "Designation with this name already exists, including archived records."
          : "Designation already exists.",
      });
      return;
    }

    const designation: any = await Designation.create({
      name: normalizedName,
      normalizedName: lookupKey,
      department: departmentId,
      departmentName,
      description: typeof description === "string" ? description.trim() : "",
      status: status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      createdBy: req.user?.userId
        ? new mongoose.Types.ObjectId(req.user.userId)
        : undefined,
    });

    const populated: any = await Designation.findById(designation._id)
      .populate("department", "name status")
      .lean();

    res.status(201).json({
      success: true,
      message: `Designation "${designation.name}" created successfully.`,
      data: {
        ...populated,
        employeeCount: 0,
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({
        success: false,
        code: "DUPLICATE_DESIGNATION",
        message: "Designation already exists.",
      });
      return;
    }
    next(error);
  }
};

/**
 * PATCH /api/admin/designations/:id
 * Update designation details or status with duplicate and format checks
 */
export const updateDesignation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, department, description, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid designation ID",
      });
      return;
    }

    const designation = await Designation.findById(id);
    if (!designation) {
      res.status(404).json({
        success: false,
        message: "Designation not found",
      });
      return;
    }

    const oldName = designation.name;

    if (department !== undefined) {
      if (!department) {
        designation.department = null;
        designation.departmentName = "";
      } else {
        let deptDoc = null;
        if (mongoose.Types.ObjectId.isValid(department)) {
          deptDoc = await Department.findById(department);
        } else if (typeof department === "string" && department.trim()) {
          deptDoc = await Department.findOne({
            normalizedName: toLookupKey(normalizeMasterDataName(department)),
          });
        }

        if (deptDoc) {
          designation.department = deptDoc._id as mongoose.Types.ObjectId;
          designation.departmentName = deptDoc.name;
        }
      }
    }

    if (name !== undefined) {
      const validation = validateMasterDataName(name, "designation");
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          code: "INVALID_DESIGNATION_NAME",
          validationCode: validation.code,
          message: validation.message,
        });
        return;
      }

      const normalizedName = validation.normalized;
      const lookupKey = toLookupKey(normalizedName);

      // Duplicate check excluding self
      const existing = await Designation.findOne({
        _id: { $ne: designation._id },
        normalizedName: lookupKey,
      });

      if (existing) {
        const isArchived = existing.status === "INACTIVE";
        res.status(409).json({
          success: false,
          code: "DUPLICATE_DESIGNATION",
          isArchived,
          message: isArchived
            ? "Designation with this name already exists, including archived records."
            : "Designation already exists.",
        });
        return;
      }

      designation.name = normalizedName;
      designation.normalizedName = lookupKey;
    }

    if (description !== undefined) {
      designation.description =
        typeof description === "string" ? description.trim() : "";
    }

    if (status !== undefined) {
      if (status !== "ACTIVE" && status !== "INACTIVE") {
        res.status(400).json({
          success: false,
          message: "Invalid status. Must be 'ACTIVE' or 'INACTIVE'.",
        });
        return;
      }
      designation.status = status;
    }

    await designation.save();

    // Propagate name change to users if changed
    if (designation.name !== oldName) {
      await User.updateMany(
        { designation: oldName },
        {
          $set: {
            designation: designation.name,
            designationId: designation._id,
          },
        },
      );
    }

    const populated = await Designation.findById(designation._id)
      .populate("department", "name status")
      .lean();

    res.status(200).json({
      success: true,
      message: `Designation "${designation.name}" updated successfully.`,
      data: populated,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({
        success: false,
        code: "DUPLICATE_DESIGNATION",
        message: "Designation already exists.",
      });
      return;
    }
    next(error);
  }
};

/**
 * DELETE /api/admin/designations/:id
 * Delete or archive designation with safe dependency check
 */
export const deleteDesignation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { action } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid designation ID",
      });
      return;
    }

    const designation = await Designation.findById(id);
    if (!designation) {
      res.status(404).json({
        success: false,
        message: "Designation not found",
      });
      return;
    }

    // Check employee dependency
    const assignedCount = await User.countDocuments({
      $or: [
        { designationId: designation._id },
        { designation: { $regex: new RegExp(`^${designation.name}$`, "i") } },
      ],
    });

    if (action === "archive") {
      designation.status = "INACTIVE";
      await designation.save();

      res.status(200).json({
        success: true,
        message: `Designation "${designation.name}" has been deactivated/archived.`,
        data: designation,
      });
      return;
    }

    if (assignedCount > 0) {
      res.status(400).json({
        success: false,
        code: "DESIGNATION_HAS_DEPENDENCIES",
        message: `Cannot delete designation "${designation.name}" because ${assignedCount} employee(s) currently hold it. Please reassign them or deactivate the designation instead.`,
        employeeCount: assignedCount,
      });
      return;
    }

    await Designation.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Designation "${designation.name}" deleted successfully.`,
      deletedId: id,
    });
  } catch (error) {
    next(error);
  }
};
