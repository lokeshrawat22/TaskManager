import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import Department from "../models/department.model.js";
import { DEPARTMENTS } from "../constants/employee.constants.js";
import {
  getEmployeeStats,
  getEmployeeRoleFilter,
} from "../services/employee.service.js";

// =====================================================
// DATE RANGE HELPER FOR PERIOD FILTERING
// =====================================================

function getDateRangeForPeriod(period?: string): {
  start?: Date;
  end?: Date;
  prevStart?: Date;
  prevEnd?: Date;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case "last_month": {
      const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      const prevStart = new Date(year, month - 2, 1, 0, 0, 0, 0);
      const prevEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);
      return { start, end, prevStart, prevEnd };
    }
    case "this_quarter": {
      const quarter = Math.floor(month / 3);
      const start = new Date(year, quarter * 3, 1, 0, 0, 0, 0);
      const end = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59, 999);
      const prevStart = new Date(year, (quarter - 1) * 3, 1, 0, 0, 0, 0);
      const prevEnd = new Date(year, quarter * 3, 0, 23, 59, 59, 999);
      return { start, end, prevStart, prevEnd };
    }
    case "this_year": {
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      const prevStart = new Date(year - 1, 0, 1, 0, 0, 0, 0);
      const prevEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);
      return { start, end, prevStart, prevEnd };
    }
    case "this_month": {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const prevStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const prevEnd = new Date(year, month, 0, 23, 59, 59, 999);
      return { start, end, prevStart, prevEnd };
    }
    case "all_time":
    default: {
      return {};
    }
  }
}

// =====================================================
// TREND CALCULATION HELPER
// =====================================================

function calculateTrend(
  current: number,
  prev?: number,
): {
  value: string;
  percentage: number | null;
  isPositive: boolean;
  isDown: boolean;
} {
  if (prev === undefined || (prev === 0 && current === 0)) {
    return { value: "—", percentage: null, isPositive: true, isDown: false };
  }
  if (prev === 0) {
    return {
      value: current > 0 ? "+100%" : "—",
      percentage: current > 0 ? 100 : null,
      isPositive: true,
      isDown: false,
    };
  }

  const diff = current - prev;
  const pct = Math.round((diff / prev) * 100);
  const isPositive = pct >= 0;
  const isDown = pct < 0;
  const value = `${pct >= 0 ? "+" : ""}${pct}%`;

  return { value, percentage: pct, isPositive, isDown };
}

// =====================================================
// ADMIN DASHBOARD STATISTICS
// =====================================================

export const getAdminDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // =================================================
    // CURRENT ADMIN
    // =================================================

    const adminId = req.user?.userId;

    if (!adminId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    // =================================================
    // GET ADMIN INFORMATION
    // =================================================

    const admin = await User.findById(adminId)
      .select(
        `
        firstName
        lastName
        email
        country
        countryCode
        phone
        dateOfBirth
        gender
        qualification
        role
        department
        designation
        employeeId
        profilePhoto
      `,
      )
      .lean();

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin not found",
      });
      return;
    }

    // =================================================
    // PERIOD FILTERING
    // =================================================

    const period =
      typeof req.query.period === "string" && req.query.period.trim()
        ? req.query.period.trim()
        : "all_time";
    const dateRange = getDateRangeForPeriod(period);

    // =================================================
    // EMPLOYEE COUNTS (SINGLE SOURCE OF TRUTH)
    // =================================================

    const { totalEmployees, activeEmployees, inactiveEmployees } =
      await getEmployeeStats();

    // =================================================
    // TASK COUNTS (SCOPE TO PERIOD IF FILTER ACTIVE)
    // =================================================

    const taskDateFilter: Record<string, any> = {};
    if (dateRange.start && dateRange.end) {
      taskDateFilter.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    const [totalTasks, pendingTasks, inProgressTasks, completedTasks] =
      await Promise.all([
        Task.countDocuments(taskDateFilter),
        Task.countDocuments({ ...taskDateFilter, status: "PENDING" }),
        Task.countDocuments({ ...taskDateFilter, status: "IN_PROGRESS" }),
        Task.countDocuments({ ...taskDateFilter, status: "COMPLETED" }),
      ]);

    // =================================================
    // OVERDUE TASKS
    // =================================================

    const overdueTasks = await Task.countDocuments({
      dueDate: { $lt: new Date() },
      status: { $ne: "COMPLETED" },
    });

    // =================================================
    // COMPLETION RATE
    // =================================================

    const completionRate =
      totalTasks === 0
        ? 0
        : Number(((completedTasks / totalTasks) * 100).toFixed(2));

    // =================================================
    // DEPARTMENTS COUNT
    // =================================================

    const activeDeptCount = await Department.countDocuments({
      status: "ACTIVE",
    });
    const totalDepartments =
      activeDeptCount > 0 ? activeDeptCount : DEPARTMENTS.length;

    // =================================================
    // TASK DISTRIBUTION (FOR DONUT CHART)
    // =================================================

    const taskDistributionAgg = await Task.aggregate([
      ...(Object.keys(taskDateFilter).length > 0
        ? [{ $match: taskDateFilter }]
        : []),
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const distribution = {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
    };

    taskDistributionAgg.forEach((item) => {
      if (item._id in distribution) {
        distribution[item._id as keyof typeof distribution] = item.count;
      }
    });

    // =================================================
    // DYNAMIC TREND CALCULATIONS (CURRENT VS PREV PERIOD)
    // =================================================

    let trends = {
      employees: {
        value: "—",
        percentage: null as number | null,
        isPositive: true,
        isDown: false,
      },
      tasks: {
        value: "—",
        percentage: null as number | null,
        isPositive: true,
        isDown: false,
      },
      completed: {
        value: "—",
        percentage: null as number | null,
        isPositive: true,
        isDown: false,
      },
      overdue: {
        value: "—",
        percentage: null as number | null,
        isPositive: true,
        isDown: false,
      },
    };

    if (
      dateRange.start &&
      dateRange.end &&
      dateRange.prevStart &&
      dateRange.prevEnd
    ) {
      const [
        empCurrent,
        empPrev,
        tasksCurrent,
        tasksPrev,
        completedCurrent,
        completedPrev,
        overdueCurrent,
        overduePrev,
      ] = await Promise.all([
        User.countDocuments(
          getEmployeeRoleFilter({
            createdAt: { $gte: dateRange.start, $lte: dateRange.end },
          }),
        ),
        User.countDocuments(
          getEmployeeRoleFilter({
            createdAt: { $gte: dateRange.prevStart, $lte: dateRange.prevEnd },
          }),
        ),
        Task.countDocuments({
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        }),
        Task.countDocuments({
          createdAt: { $gte: dateRange.prevStart, $lte: dateRange.prevEnd },
        }),
        Task.countDocuments({
          status: "COMPLETED",
          updatedAt: { $gte: dateRange.start, $lte: dateRange.end },
        }),
        Task.countDocuments({
          status: "COMPLETED",
          updatedAt: { $gte: dateRange.prevStart, $lte: dateRange.prevEnd },
        }),
        Task.countDocuments({
          dueDate: { $gte: dateRange.start, $lte: dateRange.end },
          status: { $ne: "COMPLETED" },
        }),
        Task.countDocuments({
          dueDate: { $gte: dateRange.prevStart, $lte: dateRange.prevEnd },
          status: { $ne: "COMPLETED" },
        }),
      ]);

      trends = {
        employees: calculateTrend(empCurrent, empPrev),
        tasks: calculateTrend(tasksCurrent, tasksPrev),
        completed: calculateTrend(completedCurrent, completedPrev),
        overdue: calculateTrend(overdueCurrent, overduePrev),
      };
    }

    // =================================================
    // RESPONSE
    // =================================================

    res.status(200).json({
      success: true,
      data: {
        // =============================================
        // CURRENT ADMIN
        // =============================================
        user: {
          id: String(admin._id),
          firstName: admin.firstName || "",
          lastName: admin.lastName || "",
          name: `${admin.firstName || ""} ${admin.lastName || ""}`.trim(),
          email: admin.email || "",
          country: admin.country || null,
          countryCode: admin.countryCode || null,
          phone: admin.phone || null,
          dateOfBirth: admin.dateOfBirth || null,
          gender: admin.gender || null,
          qualification: admin.qualification || null,
          role: admin.role || null,
          department: admin.department || null,
          designation: admin.designation || null,
          employeeId: admin.employeeId || String(admin._id),
          profilePhoto: admin.profilePhoto || null,
        },

        // =============================================
        // OVERVIEW
        // =============================================
        overview: {
          totalEmployees,
          activeEmployees,
          inactiveEmployees,
          totalTasks,
          pendingTasks,
          inProgressTasks,
          completedTasks,
          overdueTasks,
          totalDepartments,
          completionRate,
        },

        // =============================================
        // TASK DISTRIBUTION
        // =============================================
        taskDistribution: distribution,

        // =============================================
        // DYNAMIC TRENDS
        // =============================================
        trends,
      },
    });
  } catch (error) {
    console.error("Admin dashboard stats error:", error);
    next(error);
  }
};

// =====================================================
// EMPLOYEE DASHBOARD STATISTICS
// =====================================================

export const getEmployeeDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const employeeId = req.user!.userId;

    const employee = await User.findById(employeeId)
      .select(
        `
        firstName
        lastName
        email
        country
        countryCode
        phone
        dateOfBirth
        gender
        qualification
        role
        department
        employeeId
        profilePhoto
        isEmailVerified
        isPhoneVerified
      `,
      )
      .lean();

    if (!employee) {
      res.status(404).json({
        success: false,
        message: "Employee not found",
      });
      return;
    }

    const [totalTasks, pendingTasks, inProgressTasks, completedTasks] =
      await Promise.all([
        Task.countDocuments({ assignedTo: employeeId }),
        Task.countDocuments({ assignedTo: employeeId, status: "PENDING" }),
        Task.countDocuments({ assignedTo: employeeId, status: "IN_PROGRESS" }),
        Task.countDocuments({ assignedTo: employeeId, status: "COMPLETED" }),
      ]);

    const overdueTasks = await Task.countDocuments({
      assignedTo: employeeId,
      dueDate: { $lt: new Date() },
      status: { $ne: "COMPLETED" },
    });

    const completionRate =
      totalTasks === 0
        ? 0
        : Number(((completedTasks / totalTasks) * 100).toFixed(2));

    const now = new Date();
    const startOfTodayLocal = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfTodayLocal = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    const startOfTodayUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const endOfTodayUTC = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const minToday = new Date(
      Math.min(startOfTodayLocal.getTime(), startOfTodayUTC.getTime()),
    );
    const maxToday = new Date(
      Math.max(endOfTodayLocal.getTime(), endOfTodayUTC.getTime()),
    );

    const todaysTasks = await Task.find({
      assignedTo: employeeId,
      dueDate: { $gte: minToday, $lte: maxToday },
    })
      .select("title description status priority dueDate")
      .sort({ dueDate: 1 })
      .lean();

    const upcomingTasks = await Task.find({
      assignedTo: employeeId,
      dueDate: { $gt: maxToday },
      status: { $ne: "COMPLETED" },
    })
      .select("title description status priority dueDate")
      .sort({ dueDate: 1 })
      .limit(5)
      .lean();

    const taskDistribution = {
      PENDING: pendingTasks,
      IN_PROGRESS: inProgressTasks,
      COMPLETED: completedTasks,
    };

    res.status(200).json({
      success: true,
      message: "Employee dashboard fetched successfully",
      data: {
        user: {
          id: String(employee._id),
          firstName: employee.firstName || "",
          lastName: employee.lastName || "",
          name: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
          email: employee.email || "",
          country: employee.country || null,
          countryCode: employee.countryCode || null,
          phone: employee.phone || null,
          dateOfBirth: employee.dateOfBirth || null,
          gender: employee.gender || null,
          qualification: employee.qualification || null,
          role: employee.role || null,
          department: employee.department || null,
          employeeId: employee.employeeId || String(employee._id),
          profilePhoto: employee.profilePhoto || null,
          isEmailVerified: Boolean(employee.isEmailVerified),
          isPhoneVerified: Boolean(employee.isPhoneVerified),
          emailVerified: Boolean(employee.isEmailVerified),
          phoneVerified: Boolean(employee.isPhoneVerified),
        },
        overview: {
          totalTasks,
          pendingTasks,
          inProgressTasks,
          completedTasks,
          overdueTasks,
          completionRate,
        },
        taskDistribution,
        todaysTasks,
        upcomingTasks,
      },
    });
  } catch (error) {
    console.error("Employee dashboard stats error:", error);
    next(error);
  }
};

// =====================================================
// EMPLOYEE TASK PERFORMANCE (REAL DATABASE & PAGINATED)
// ADMIN ONLY
// =====================================================

export const employeePerformance = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const limit = Math.max(
      1,
      Math.min(50, parseInt(String(req.query.limit || "6"), 10) || 6),
    );
    const skip = (page - 1) * limit;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const department =
      typeof req.query.department === "string"
        ? req.query.department.trim()
        : "";
    const role =
      typeof req.query.role === "string" ? req.query.role.trim() : "";
    const period =
      typeof req.query.period === "string" && req.query.period.trim()
        ? req.query.period.trim().toLowerCase().replace(/-/g, "_")
        : typeof req.query.dateRange === "string" && req.query.dateRange.trim()
        ? req.query.dateRange.trim().toLowerCase().replace(/-/g, "_")
        : "all_time";

    const userFilter: Record<string, any> = getEmployeeRoleFilter();

    // 1. Role filter (handles actual application roles)
    if (role && role !== "ALL" && role !== "all") {
      const normalizedRole = role.toLowerCase().replace(/[\s-]+/g, "_");
      if (normalizedRole === "employee" || normalizedRole === "user") {
        userFilter.role = { $in: ["employee", "user"] };
      } else if (normalizedRole === "administrator" || normalizedRole === "admin") {
        userFilter.role = { $in: ["administrator", "admin"] };
      } else if (
        normalizedRole === "super_admin" ||
        normalizedRole === "superadmin" ||
        normalizedRole === "super_administrator"
      ) {
        userFilter.role = { $in: ["super_admin", "superadmin"] };
      } else {
        userFilter.role = role;
      }
    }

    // 2. Department filter
    if (department && department !== "ALL" && department !== "all") {
      const escapedDept = department.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const isObjectId = mongoose.Types.ObjectId.isValid(department);
      if (isObjectId) {
        userFilter.$or = [
          { departmentId: department },
          { department: new RegExp(`^${escapedDept}$`, "i") },
        ];
      } else {
        userFilter.department = new RegExp(`^${escapedDept}$`, "i");
      }
    }

    // 3. Search filter
    if (search) {
      const regex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      const searchConditions = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { designation: regex },
        { department: regex },
        { employeeId: regex },
      ];

      if (userFilter.$or) {
        userFilter.$and = [
          { $or: userFilter.$or },
          { $or: searchConditions },
        ];
        delete userFilter.$or;
      } else {
        userFilter.$or = searchConditions;
      }
    }

    const total = await User.countDocuments(userFilter);

    const users = await User.find(userFilter)
      .select(
        "firstName lastName email employeeId department designation role profilePhoto isBlocked createdAt",
      )
      .sort({ firstName: 1, lastName: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const userIds = users.map((u) => u._id);

    // 4. Date filtering on task performance
    const dateRange = getDateRangeForPeriod(period);
    const taskMatch: Record<string, any> = {
      assignedTo: { $in: userIds },
    };

    if (dateRange.start && dateRange.end) {
      taskMatch.createdAt = { $gte: dateRange.start, $lte: dateRange.end };
    }

    // Aggregate task stats for these users in one efficient query
    const taskStats = await Task.aggregate([
      { $match: taskMatch },
      {
        $group: {
          _id: "$assignedTo",
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ["$status", "IN_PROGRESS"] }, 1, 0] },
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$dueDate", new Date()] },
                    { $ne: ["$status", "COMPLETED"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const statsMap = new Map<string, any>();
    taskStats.forEach((stat) => {
      statsMap.set(String(stat._id), stat);
    });

    const employees = users.map((user) => {
      const stats = statsMap.get(String(user._id)) || {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
      };

      const totalTasks = stats.totalTasks;
      const completedTasks = stats.completedTasks;
      const completionRate =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: String(user._id),
        _id: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        email: user.email,
        employeeId: user.employeeId,
        department: user.department || "Operations",
        designation: user.designation || "Executive",
        role: user.role || "employee",
        profilePhoto: user.profilePhoto || null,
        isBlocked: Boolean(user.isBlocked),
        totalTasks,
        completedTasks,
        pendingTasks: stats.pendingTasks,
        inProgressTasks: stats.inProgressTasks,
        overdueTasks: stats.overdueTasks,
        completionRate,
      };
    });

    res.status(200).json({
      success: true,
      message: "Employee performance fetched successfully",
      data: {
        employees,
        employeePerformance: employees,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Employee performance error:", error);
    next(error);
  }
};
