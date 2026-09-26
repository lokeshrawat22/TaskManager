import { Request, Response, NextFunction } from "express";

import User from "../models/user.model.js";
import Task from "../models/task.model.js";
import Department from "../models/department.model.js";
import { DEPARTMENTS } from "../constants/employee.constants.js";
import { getEmployeeRoleFilter } from "../services/employee.service.js";

// =====================================================
// ESCAPE REGEX
// =====================================================

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// =====================================================
// GLOBAL ADMIN SEARCH
// =====================================================

export const globalSearch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

    // =================================================
    // VALIDATION
    // =================================================

    if (!query) {
      res.status(200).json({
        success: true,
        data: {
          employees: [],
          tasks: [],
          departments: [],
        },
      });

      return;
    }

    // =================================================
    // LIMIT QUERY LENGTH
    // =================================================

    if (query.length > 100) {
      res.status(400).json({
        success: false,
        message: "Search query is too long.",
      });

      return;
    }

    const safeQuery = escapeRegex(query);

    const regex = new RegExp(safeQuery, "i");

    // =================================================
    // SEARCH EMPLOYEES
    // =================================================

    const employees = await User.find(
      getEmployeeRoleFilter({
        $or: [
        {
          firstName: regex,
        },
        {
          lastName: regex,
        },
        {
          email: regex,
        },
        {
          employeeId: regex,
        },
        {
          department: regex,
        },
        {
          designation: regex,
        },
      ],
    }),
  )
      .select(
        "_id firstName lastName email employeeId department designation profilePhoto",
      )
      .limit(8)
      .lean();

    // =================================================
    // SEARCH TASKS
    // =================================================

    const tasks = await Task.find({
      $or: [
        {
          title: regex,
        },
        {
          description: regex,
        },
      ],
    })
      .select("_id title description status priority dueDate")
      .limit(8)
      .lean();

    // =================================================
    // SEARCH DEPARTMENTS
    // =================================================

    const dbDepts = await Department.find({
      name: { $regex: regex },
      status: "ACTIVE",
    }).lean();

    const seenDeptNames = new Set(dbDepts.map((d) => d.name.toLowerCase()));
    const staticMatches = DEPARTMENTS.filter(
      (dept) =>
        dept.toLowerCase().includes(query.toLowerCase()) &&
        !seenDeptNames.has(dept.toLowerCase()),
    ).map((name) => ({
      name,
      id: name,
    }));

    const departments = [
      ...dbDepts.map((d) => ({ name: d.name, id: String(d._id) })),
      ...staticMatches,
    ];

    // =================================================
    // RESPONSE
    // =================================================

    res.status(200).json({
      success: true,
      data: {
        employees,
        tasks,
        departments,
      },
    });
  } catch (error) {
    console.error("Global search error:", error);

    next(error);
  }
};
