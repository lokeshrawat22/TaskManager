import PDFDocument from "pdfkit";
import { Request, Response } from "express";
import ExcelJS from "exceljs";
import User from "../models/user.model.js";
import Task from "../models/task.model.js";
import { getEmployeeRoleFilter } from "../services/employee.service.js";
import { ROLES, normalizeRole } from "../constants/rbac.constants.js";

// =====================================================
// HELPER: Format Date to YYYY-MM-DD HH:mm:ss
// =====================================================
function formatDate(dateValue: any): string {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDateOnly(dateValue: any): string {
  if (!dateValue) return "—";
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getTodayString(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// =====================================================
// HELPER: Sanitize CSV Cell against Formula Injection
// =====================================================
export function sanitizeCsvCell(
  val: string | number | null | undefined,
): string {
  if (val === null || val === undefined) return "";
  let str = String(val);

  if (!str) return "";

  const firstChar = str[0];

  // Formulas starting with '=', '@', tab, or carriage return
  if (
    firstChar === "=" ||
    firstChar === "@" ||
    firstChar === "\t" ||
    firstChar === "\r"
  ) {
    return `'${str}`;
  }

  // Cells starting with '+' or '-'
  if (firstChar === "+" || firstChar === "-") {
    // Pure simple numbers or phone numbers without formula symbols
    const isSafePhoneNumberOrNumber =
      /^[+-]\d{1,15}$/.test(str) || /^[+-]\d+(\.\d+)?$/.test(str);
    if (!isSafePhoneNumberOrNumber) {
      return `'${str}`;
    }
  }

  return str;
}

// =====================================================
// HELPER: RFC 4180 CSV Row Formatter
// =====================================================
function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((val) => {
      const str = sanitizeCsvCell(val);
      if (
        str.includes(",") ||
        str.includes('"') ||
        str.includes("\n") ||
        str.includes("\r")
      ) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    })
    .join(",");
}

// =====================================================
// EXPORT HANDLER
// =====================================================
export const exportData = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const rawScope = ((req.query.scope as string) || "all").toLowerCase();
    const scope = ["employees", "tasks", "reports", "all"].includes(rawScope)
      ? rawScope
      : "all";

    const rawFormat = ((req.query.format as string) || "xlsx").toLowerCase();
    const format = ["csv", "xlsx", "json", "pdf"].includes(rawFormat)
      ? rawFormat
      : "xlsx";

    const todayStr = getTodayString();

    // Authenticated user & role verification
    const currentUser = (req as any).user;
    const userRole = normalizeRole(currentUser?.role);
    const userId = currentUser?.userId;
    const isAdmin =
      userRole === ROLES.ADMINISTRATOR || userRole === ROLES.SUPER_ADMIN;

    // RBAC: Non-admin users cannot export organization employee directory or global "all" datasets
    if ((scope === "employees" || scope === "all") && !isAdmin) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to export organization employee directory.",
      });
      return;
    }

    // ---------------------------------------------------
    // 1. FETCH & PROCESS EMPLOYEES DATA (if scope === employees or all)
    // ---------------------------------------------------
    let employeeDataRows: any[] = [];
    if (scope === "employees" || scope === "all") {
      const employeeQuery: any = getEmployeeRoleFilter();

      // Status filter
      if (req.query.status && req.query.status !== "ALL") {
        if (req.query.status === "Active") employeeQuery.isBlocked = false;
        else if (req.query.status === "Inactive") employeeQuery.isBlocked = true;
      }

      // Department filter
      if (req.query.department && req.query.department !== "ALL") {
        employeeQuery.department = req.query.department;
      }

      // Role filter
      const roleParam = (req.query.employeeRole || req.query.role) as string;
      if (roleParam && roleParam !== "ALL") {
        employeeQuery.role = roleParam;
      }

      // Search keyword filter
      const searchParam = ((req.query.search || req.query.q) as string)?.trim();
      if (searchParam) {
        const regex = new RegExp(searchParam, "i");
        employeeQuery.$or = [
          { firstName: regex },
          { lastName: regex },
          { email: regex },
          { employeeId: regex },
          { department: regex },
        ];
      }

      // Specific IDs filter
      if (req.query.ids) {
        const idList = (req.query.ids as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (idList.length > 0) {
          employeeQuery._id = { $in: idList };
        }
      }

      const employees = await User.find(employeeQuery)
        .select("-password -emailOtp -emailOtpExpiresAt")
        .sort({ createdAt: -1 })
        .lean();

      // Aggregate task stats for these employees
      const allTasks = await Task.find({}).select("assignedTo status").lean();
      const statsMap = new Map<string, { total: number; completed: number }>();

      allTasks.forEach((t: any) => {
        if (!t.assignedTo) return;
        const assignId = t.assignedTo.toString();
        const current = statsMap.get(assignId) || { total: 0, completed: 0 };
        current.total += 1;
        if (String(t.status || "").toUpperCase() === "COMPLETED") {
          current.completed += 1;
        }
        statsMap.set(assignId, current);
      });

      employeeDataRows = employees.map((emp: any) => {
        const empIdStr = emp._id.toString();
        const stats = statsMap.get(empIdStr) || { total: 0, completed: 0 };
        const completionRate =
          stats.total > 0
            ? Math.round((stats.completed / stats.total) * 100)
            : 0;
        const fullName =
          `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
          emp.name ||
          "Unnamed";

        return {
          employeeId: emp.employeeId || empIdStr,
          firstName: emp.firstName || "",
          lastName: emp.lastName || "",
          fullName,
          email: emp.email || "",
          phone: emp.phone || "",
          department: emp.department || "Unassigned",
          designation: emp.designation || "Unassigned",
          role: emp.role || "employee",
          status: emp.isBlocked ? "Inactive" : "Active",
          taskCount: stats.total,
          completedTasks: stats.completed,
          completionPercentage: `${completionRate}%`,
          createdDate: formatDate(emp.createdAt),
          updatedDate: formatDate(emp.updatedAt),
        };
      });
    }

    // ---------------------------------------------------
    // 2. FETCH & PROCESS TASKS DATA (if scope === tasks or all)
    // ---------------------------------------------------
    let taskDataRows: any[] = [];
    if (scope === "tasks" || scope === "all") {
      const taskQuery: any = {};

      // Enforce authorization boundaries: non-admins can only export their own tasks
      if (!isAdmin) {
        taskQuery.assignedTo = userId;
      } else {
        const assigneeParam = (req.query.assignee || req.query.assignedTo) as string;
        if (assigneeParam && assigneeParam !== "ALL") {
          taskQuery.assignedTo = assigneeParam;
        }
      }

      // Department filter
      if (req.query.department && req.query.department !== "ALL") {
        const deptUsers = await User.find({ department: req.query.department as string } as any).select("_id").lean();
        const deptUserIds = deptUsers.map((u: any) => u._id);
        if (taskQuery.assignedTo) {
          if (!deptUserIds.some((id: any) => id.toString() === taskQuery.assignedTo.toString())) {
            taskQuery.assignedTo = { $in: [] }; // No match
          }
        } else {
          taskQuery.assignedTo = { $in: deptUserIds };
        }
      }

      // Status filter
      const statusParam = (req.query.status || req.query.taskStatus) as string;
      if (statusParam && statusParam !== "ALL") {
        if (statusParam === "OVERDUE") {
          taskQuery.dueDate = { $lt: new Date() };
          taskQuery.status = { $ne: "COMPLETED" };
        } else {
          taskQuery.status = statusParam;
        }
      }

      // Priority filter
      const priorityParam = (req.query.priority || req.query.taskPriority) as string;
      if (priorityParam && priorityParam !== "ALL") {
        taskQuery.priority = priorityParam;
      }

      // Date filtering
      const dateFilter = req.query.dateFilter as string;
      const fromDate = req.query.fromDate as string;
      const toDate = req.query.toDate as string;
      const now = new Date();

      if (dateFilter === "TODAY") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        taskQuery.dueDate = { $gte: startOfDay, $lte: endOfDay };
      } else if (dateFilter === "UPCOMING") {
        taskQuery.dueDate = { $gte: now };
      } else if (dateFilter === "OVERDUE") {
        taskQuery.dueDate = { $lt: now };
        taskQuery.status = { $ne: "COMPLETED" };
      } else if ((dateFilter === "CUSTOM" || fromDate || toDate) && (fromDate || toDate)) {
        const dateCond: any = {};
        if (fromDate) dateCond.$gte = new Date(fromDate);
        if (toDate) {
          const toD = new Date(toDate);
          toD.setHours(23, 59, 59, 999);
          dateCond.$lte = toD;
        }
        taskQuery.dueDate = dateCond;
      }

      // Search query filter
      const searchParam = ((req.query.search || req.query.q) as string)?.trim();
      if (searchParam) {
        const regex = new RegExp(searchParam, "i");
        taskQuery.$or = [
          { title: regex },
          { description: regex },
        ];
      }

      // Specific IDs filter
      const idParam = (req.query.taskIds || req.query.ids) as string;
      if (idParam) {
        const idList = idParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (idList.length > 0) {
          taskQuery._id = { $in: idList };
        }
      }

      const tasks = await Task.find(taskQuery)
        .populate(
          "assignedTo",
          "firstName lastName name email employeeId department",
        )
        .sort({ createdAt: -1 })
        .lean();

      taskDataRows = tasks.map((t: any) => {
        const assignee = t.assignedTo as any;
        const assigneeName = assignee
          ? `${assignee.firstName || ""} ${assignee.lastName || ""}`.trim() ||
            assignee.name ||
            "Unassigned"
          : "Unassigned";

        return {
          taskId: t._id.toString(),
          title: t.title || "",
          description: t.description || "",
          assignedEmployee: assigneeName,
          assignedEmployeeId: assignee?.employeeId || "",
          assignedEmployeeEmail: assignee?.email || "",
          status: t.status || "PENDING",
          priority: t.priority || "MEDIUM",
          dueDate: formatDate(t.dueDate),
          completedAt: t.completedAt ? formatDate(t.completedAt) : "",
          createdDate: formatDate(t.createdAt),
          updatedDate: formatDate(t.updatedAt),
        };
      });
    }

    // ---------------------------------------------------
    // 3. FETCH & PROCESS REPORTS DATA (if scope === reports)
    // ---------------------------------------------------
    let reportData: any = null;
    if (scope === "reports") {
      const reportTaskQuery: any = {};
      if (!isAdmin) {
        reportTaskQuery.assignedTo = userId;
      } else {
        if (req.query.assignee && req.query.assignee !== "ALL") {
          reportTaskQuery.assignedTo = req.query.assignee;
        }
        if (req.query.department && req.query.department !== "ALL") {
          const deptUsers = await User.find({ department: req.query.department as string } as any).select("_id").lean();
          reportTaskQuery.assignedTo = { $in: deptUsers.map((u: any) => u._id) };
        }
      }

      // Report date filters
      const fromDate = req.query.fromDate as string;
      const toDate = req.query.toDate as string;
      if (fromDate || toDate) {
        const dateCond: any = {};
        if (fromDate) dateCond.$gte = new Date(fromDate);
        if (toDate) {
          const toD = new Date(toDate);
          toD.setHours(23, 59, 59, 999);
          dateCond.$lte = toD;
        }
        reportTaskQuery.createdAt = dateCond;
      }

      // Status filter
      const statusParam = (req.query.status || req.query.taskStatus) as string;
      if (statusParam && statusParam !== "ALL") {
        if (statusParam === "OVERDUE") {
          reportTaskQuery.dueDate = { $lt: new Date() };
          reportTaskQuery.status = { $ne: "COMPLETED" };
        } else {
          reportTaskQuery.status = statusParam;
        }
      }

      // Priority filter
      const priorityParam = (req.query.priority || req.query.taskPriority) as string;
      if (priorityParam && priorityParam !== "ALL") {
        reportTaskQuery.priority = priorityParam;
      }

      // Search filter
      const searchParam = ((req.query.search || req.query.q) as string)?.trim();
      if (searchParam) {
        const regex = new RegExp(searchParam, "i");
        reportTaskQuery.$or = [
          { title: regex },
          { description: regex },
        ];
      }

      const tasks = await Task.find(reportTaskQuery)
        .populate("assignedTo", "firstName lastName name email department employeeId")
        .sort({ createdAt: -1 })
        .lean();

      const total = tasks.length;
      let completed = 0;
      let inProgress = 0;
      let pending = 0;
      let overdue = 0;
      const deptMap = new Map<string, { total: number; completed: number; inProgress: number; pending: number; overdue: number }>();
      const priorityMap: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };

      const now = Date.now();
      const taskRows = tasks.map((t: any) => {
        const status = String(t.status || "PENDING").toUpperCase();
        const priority = String(t.priority || "MEDIUM").toUpperCase();
        if (priorityMap[priority] !== undefined) priorityMap[priority]++;

        const isTaskOverdue = t.dueDate && new Date(t.dueDate).getTime() < now && status !== "COMPLETED";

        if (status === "COMPLETED") completed++;
        else if (status === "IN_PROGRESS") inProgress++;
        else pending++;

        if (isTaskOverdue) overdue++;

        const assignee = t.assignedTo as any;
        const dept = assignee?.department || "Unassigned";
        const currentDept = deptMap.get(dept) || { total: 0, completed: 0, inProgress: 0, pending: 0, overdue: 0 };
        currentDept.total++;
        if (status === "COMPLETED") currentDept.completed++;
        else if (status === "IN_PROGRESS") currentDept.inProgress++;
        else currentDept.pending++;
        if (isTaskOverdue) currentDept.overdue++;
        deptMap.set(dept, currentDept);

        const assigneeName = assignee
          ? `${assignee.firstName || ""} ${assignee.lastName || ""}`.trim() || assignee.name || "Unassigned"
          : "Unassigned";

        return {
          taskId: t._id.toString(),
          title: t.title || "",
          description: t.description || "",
          assignee: assigneeName,
          assigneeEmail: assignee?.email || "",
          department: dept,
          status,
          priority,
          dueDate: formatDate(t.dueDate),
          completedAt: t.completedAt ? formatDate(t.completedAt) : "",
          createdAt: formatDate(t.createdAt),
          isOverdue: isTaskOverdue ? "YES" : "NO",
        };
      });

      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const onTimeRate = completed > 0 ? Math.round(((completed - Math.min(completed, overdue)) / completed) * 100) : 100;

      const departmentBreakdown = Array.from(deptMap.entries()).map(([dept, dStats]) => ({
        department: dept,
        totalTasks: dStats.total,
        completedTasks: dStats.completed,
        inProgressTasks: dStats.inProgress,
        pendingTasks: dStats.pending,
        overdueTasks: dStats.overdue,
        completionRate: dStats.total > 0 ? `${Math.round((dStats.completed / dStats.total) * 100)}%` : "0%",
      }));

      reportData = {
        summary: {
          totalTasks: total,
          completedTasks: completed,
          inProgressTasks: inProgress,
          pendingTasks: pending,
          overdueTasks: overdue,
          completionRate: `${completionRate}%`,
          onTimeRate: `${onTimeRate}%`,
          generatedAt: new Date().toISOString(),
          scope: isAdmin ? "ORGANIZATION" : "INDIVIDUAL",
        },
        priorityBreakdown: priorityMap,
        departmentBreakdown,
        tasks: taskRows,
      };
    }

    // Check if there is data to export
    const totalRecords =
      scope === "reports"
        ? (reportData?.summary?.totalTasks || 0)
        : employeeDataRows.length + taskDataRows.length;

    if (totalRecords === 0) {
      res.status(404).json({
        success: false,
        message: "No data available to export.",
      });
      return;
    }

    // ---------------------------------------------------
    // 4. FORMAT DISPATCHER
    // ---------------------------------------------------

    // ===================================================
    // JSON FORMAT
    // ===================================================
    if (format === "json") {
      const fileName =
        scope === "employees"
          ? `employees_${todayStr}.json`
          : scope === "tasks"
            ? `tasks_${todayStr}.json`
            : scope === "reports"
              ? `performance_report_${todayStr}.json`
              : `mindmatrix_export_${todayStr}.json`;

      let outputData: any = {};
      if (scope === "employees") {
        outputData = employeeDataRows;
      } else if (scope === "tasks") {
        outputData = taskDataRows;
      } else if (scope === "reports") {
        outputData = reportData;
      } else {
        outputData = {
          exportDate: todayStr,
          totalEmployees: employeeDataRows.length,
          totalTasks: taskDataRows.length,
          employees: employeeDataRows,
          tasks: taskDataRows,
        };
      }

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(200).send(JSON.stringify(outputData, null, 2));
      return;
    }

    // ===================================================
    // CSV FORMAT
    // ===================================================
    if (format === "csv") {
      // 1. Employees CSV
      if (scope === "employees") {
        const headers = [
          "Employee ID",
          "First Name",
          "Last Name",
          "Full Name",
          "Email",
          "Phone",
          "Department",
          "Designation",
          "Role",
          "Status",
          "Task Count",
          "Completed Tasks",
          "Completion Rate",
          "Created Date",
          "Updated Date",
        ];

        const rows = [toCsvRow(headers)];
        for (const row of employeeDataRows) {
          rows.push(
            toCsvRow([
              row.employeeId,
              row.firstName,
              row.lastName,
              row.fullName,
              row.email,
              row.phone,
              row.department,
              row.designation,
              row.role,
              row.status,
              row.taskCount,
              row.completedTasks,
              row.completionPercentage,
              row.createdDate,
              row.updatedDate,
            ]),
          );
        }

        const csvContent = "\uFEFF" + rows.join("\r\n");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="employees_${todayStr}.csv"`,
        );
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.status(200).send(csvContent);
        return;
      }

      // 2. Tasks CSV
      if (scope === "tasks") {
        const headers = [
          "Task ID",
          "Title",
          "Description",
          "Assigned Employee",
          "Employee ID",
          "Employee Email",
          "Status",
          "Priority",
          "Due Date",
          "Completed Date",
          "Created Date",
          "Updated Date",
        ];

        const rows = [toCsvRow(headers)];
        for (const row of taskDataRows) {
          rows.push(
            toCsvRow([
              row.taskId,
              row.title,
              row.description,
              row.assignedEmployee,
              row.assignedEmployeeId,
              row.assignedEmployeeEmail,
              row.status,
              row.priority,
              row.dueDate,
              row.completedAt,
              row.createdDate,
              row.updatedDate,
            ]),
          );
        }

        const csvContent = "\uFEFF" + rows.join("\r\n");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="tasks_${todayStr}.csv"`,
        );
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.status(200).send(csvContent);
        return;
      }

      // 3. Reports CSV
      if (scope === "reports") {
        const s = reportData.summary;
        const summaryRows = [
          toCsvRow(["=== EXECUTIVE PERFORMANCE REPORT & KPIS ==="]),
          toCsvRow(["Generated At", s.generatedAt]),
          toCsvRow(["Scope", s.scope]),
          toCsvRow(["Total Tasks", s.totalTasks]),
          toCsvRow(["Completed Tasks", s.completedTasks]),
          toCsvRow(["In Progress Tasks", s.inProgressTasks]),
          toCsvRow(["Pending Tasks", s.pendingTasks]),
          toCsvRow(["Overdue Tasks", s.overdueTasks]),
          toCsvRow(["Completion Rate", s.completionRate]),
          toCsvRow(["On-Time Delivery Rate", s.onTimeRate]),
          toCsvRow([""]),
        ];

        const deptHeaders = [
          "Department",
          "Total Tasks",
          "Completed",
          "In Progress",
          "Pending",
          "Overdue",
          "Completion Rate",
        ];
        const deptRows = [
          toCsvRow(["=== DEPARTMENT PERFORMANCE ==="]),
          toCsvRow(deptHeaders),
          ...reportData.departmentBreakdown.map((d: any) =>
            toCsvRow([
              d.department,
              d.totalTasks,
              d.completedTasks,
              d.inProgressTasks,
              d.pendingTasks,
              d.overdueTasks,
              d.completionRate,
            ]),
          ),
          toCsvRow([""]),
        ];

        const taskHeaders = [
          "Task ID",
          "Title",
          "Description",
          "Assignee",
          "Department",
          "Status",
          "Priority",
          "Due Date",
          "Completed Date",
          "Created Date",
          "Overdue",
        ];
        const taskRows = [
          toCsvRow(["=== TASK DELIVERABLES ==="]),
          toCsvRow(taskHeaders),
          ...reportData.tasks.map((t: any) =>
            toCsvRow([
              t.taskId,
              t.title,
              t.description,
              t.assignee,
              t.department,
              t.status,
              t.priority,
              t.dueDate,
              t.completedAt,
              t.createdAt,
              t.isOverdue,
            ]),
          ),
        ];

        const reportCsv = "\uFEFF" + [...summaryRows, ...deptRows, ...taskRows].join("\r\n");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="performance_report_${todayStr}.csv"`,
        );
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.status(200).send(reportCsv);
        return;
      }

      // 4. Combined "all" CSV
      const empHeaders = [
        "Employee ID",
        "First Name",
        "Last Name",
        "Full Name",
        "Email",
        "Department",
        "Designation",
        "Role",
        "Status",
        "Task Count",
        "Completion Rate",
        "Created Date",
      ];
      const empRows = [
        toCsvRow(["=== EMPLOYEES DATA ==="]),
        toCsvRow(empHeaders),
        ...employeeDataRows.map((r) =>
          toCsvRow([
            r.employeeId,
            r.firstName,
            r.lastName,
            r.fullName,
            r.email,
            r.department,
            r.designation,
            r.role,
            r.status,
            r.taskCount,
            r.completionPercentage,
            r.createdDate,
          ]),
        ),
      ];

      const taskHeaders = [
        "Task ID",
        "Title",
        "Description",
        "Assigned Employee",
        "Employee ID",
        "Status",
        "Priority",
        "Due Date",
        "Completed Date",
        "Created Date",
      ];
      const tRows = [
        toCsvRow([""]),
        toCsvRow(["=== TASKS DATA ==="]),
        toCsvRow(taskHeaders),
        ...taskDataRows.map((r) =>
          toCsvRow([
            r.taskId,
            r.title,
            r.description,
            r.assignedEmployee,
            r.assignedEmployeeId,
            r.status,
            r.priority,
            r.dueDate,
            r.completedAt,
            r.createdDate,
          ]),
        ),
      ];

      const combinedCsv = "\uFEFF" + [...empRows, ...tRows].join("\r\n");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="mindmatrix_all_data_${todayStr}.csv"`,
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.status(200).send(combinedCsv);
      return;
    }

    // ===================================================
    // PDF (.pdf) FORMAT
    // ===================================================
    if (format === "pdf") {
      const pdfFileName =
        scope === "employees"
          ? `employees_${todayStr}.pdf`
          : scope === "tasks"
            ? `tasks_${todayStr}.pdf`
            : scope === "reports"
              ? `performance_report_${todayStr}.pdf`
              : `mindmatrix_export_${todayStr}.pdf`;

      const doc = new PDFDocument({
        margin: 36,
        size: "A4",
        bufferPages: true,
      });

      const pdfChunks: Buffer[] = [];
      doc.on("data", (chunk: any) => pdfChunks.push(Buffer.from(chunk)));

      const pageWidth = 595.28;
      const leftMargin = 36;
      const contentWidth = pageWidth - leftMargin * 2;

      // Brand Header Banner
      doc.rect(leftMargin, 36, contentWidth, 50).fill("#063D63");
      doc
        .fillColor("#FFFFFF")
        .fontSize(15)
        .font("Helvetica-Bold")
        .text("MINDMATRIX WORKFORCE MANAGEMENT", leftMargin + 16, 47);
      doc
        .fillColor("#A6EDF1")
        .fontSize(9)
        .font("Helvetica")
        .text(
          scope === "reports"
            ? `EXECUTIVE PERFORMANCE & ANALYTICS REPORT · GENERATED ON ${todayStr}`
            : `OFFICIAL DATA EXPORT REPORT · GENERATED ON ${todayStr}`,
          leftMargin + 16,
          67,
        );

      // Metadata summary strip
      doc.rect(leftMargin, 94, contentWidth, 24).fill("#F4F9FB");
      doc
        .fillColor("#536B77")
        .fontSize(8)
        .font("Helvetica-Bold");

      if (scope === "reports") {
        doc.text(`SCOPE: ${reportData.summary.scope}`, leftMargin + 12, 102);
        doc.text(`TOTAL DELIVERABLES: ${reportData.summary.totalTasks}`, leftMargin + 140, 102);
        doc.text(`COMPLETION RATE: ${reportData.summary.completionRate}`, leftMargin + 280, 102);
        doc.text(`CONFIDENTIAL`, leftMargin + 420, 102);
      } else {
        doc.text(`SCOPE: ${scope.toUpperCase()}`, leftMargin + 12, 102);
        doc.text(`EMPLOYEES: ${employeeDataRows.length}`, leftMargin + 150, 102);
        doc.text(`TASKS: ${taskDataRows.length}`, leftMargin + 270, 102);
        doc.text(`CONFIDENTIAL`, leftMargin + 420, 102);
      }

      let currentY = 130;

      // --- REPORTS SECTION (if scope === reports) ---
      if (scope === "reports") {
        // KPI Summary Boxes
        const boxWidth = (contentWidth - 24) / 4;
        const boxHeight = 44;

        const kpis = [
          { label: "TOTAL TASKS", val: String(reportData.summary.totalTasks), col: "#063D63", bg: "#EEF8FA" },
          { label: "COMPLETED", val: String(reportData.summary.completedTasks), col: "#059669", bg: "#ECFDF5" },
          { label: "IN PROGRESS", val: String(reportData.summary.inProgressTasks), col: "#2563EB", bg: "#EFF6FF" },
          { label: "OVERDUE", val: String(reportData.summary.overdueTasks), col: "#DC2626", bg: "#FEF2F2" },
        ];

        kpis.forEach((kpi, idx) => {
          const bx = leftMargin + idx * (boxWidth + 8);
          doc.rect(bx, currentY, boxWidth, boxHeight).fill(kpi.bg);
          doc.rect(bx, currentY, boxWidth, boxHeight).lineWidth(0.5).stroke("#D6E4EC");
          doc.fillColor("#64748B").fontSize(7).font("Helvetica-Bold").text(kpi.label, bx + 8, currentY + 7);
          doc.fillColor(kpi.col).fontSize(14).font("Helvetica-Bold").text(kpi.val, bx + 8, currentY + 18);
        });

        currentY += 56;

        // Department breakdown table
        if (reportData.departmentBreakdown.length > 0) {
          doc.fillColor("#063D63").fontSize(10).font("Helvetica-Bold").text("DEPARTMENT PERFORMANCE BREAKDOWN", leftMargin, currentY);
          currentY += 14;

          doc.rect(leftMargin, currentY, contentWidth, 16).fill("#087D8F");
          doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica-Bold");
          doc.text("DEPARTMENT", leftMargin + 6, currentY + 4, { width: 150 });
          doc.text("TOTAL", leftMargin + 160, currentY + 4, { width: 60 });
          doc.text("COMPLETED", leftMargin + 225, currentY + 4, { width: 70 });
          doc.text("IN PROGRESS", leftMargin + 300, currentY + 4, { width: 75 });
          doc.text("OVERDUE", leftMargin + 380, currentY + 4, { width: 60 });
          doc.text("RATE", leftMargin + 445, currentY + 4, { width: 60 });

          currentY += 16;

          reportData.departmentBreakdown.forEach((dept: any, idx: number) => {
            if (currentY > 740) {
              doc.addPage();
              currentY = 40;
            }
            if (idx % 2 === 1) {
              doc.rect(leftMargin, currentY, contentWidth, 15).fill("#F8FAFC");
            }
            doc.fillColor("#334155").fontSize(7).font("Helvetica");
            doc.text(String(dept.department), leftMargin + 6, currentY + 4, { width: 150 });
            doc.text(String(dept.totalTasks), leftMargin + 160, currentY + 4, { width: 60 });
            doc.text(String(dept.completedTasks), leftMargin + 225, currentY + 4, { width: 70 });
            doc.text(String(dept.inProgressTasks), leftMargin + 300, currentY + 4, { width: 75 });
            doc.text(String(dept.overdueTasks), leftMargin + 380, currentY + 4, { width: 60 });
            doc.text(String(dept.completionRate), leftMargin + 445, currentY + 4, { width: 60 });
            currentY += 15;
          });

          currentY += 16;
        }

        // Deliverables list
        if (currentY > 600) {
          doc.addPage();
          currentY = 40;
        }

        doc.fillColor("#063D63").fontSize(10).font("Helvetica-Bold").text("TASK DELIVERABLES", leftMargin, currentY);
        currentY += 14;

        const drawReportTaskHeader = (y: number) => {
          doc.rect(leftMargin, y, contentWidth, 16).fill("#087D8F");
          doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica-Bold");
          doc.text("TITLE", leftMargin + 6, y + 4, { width: 160 });
          doc.text("ASSIGNEE", leftMargin + 170, y + 4, { width: 100 });
          doc.text("STATUS", leftMargin + 275, y + 4, { width: 65 });
          doc.text("PRIORITY", leftMargin + 345, y + 4, { width: 55 });
          doc.text("DUE DATE", leftMargin + 405, y + 4, { width: 60 });
          doc.text("OVERDUE", leftMargin + 470, y + 4, { width: 45 });
        };

        drawReportTaskHeader(currentY);
        currentY += 16;

        reportData.tasks.forEach((task: any, idx: number) => {
          if (currentY > 740) {
            doc.addPage();
            currentY = 40;
            drawReportTaskHeader(currentY);
            currentY += 16;
          }
          if (idx % 2 === 1) {
            doc.rect(leftMargin, currentY, contentWidth, 15).fill("#F8FAFC");
          }
          doc.fillColor("#334155").fontSize(7).font("Helvetica");
          doc.text(String(task.title || "—").slice(0, 32), leftMargin + 6, currentY + 4, { width: 160 });
          doc.text(String(task.assignee || "—").slice(0, 20), leftMargin + 170, currentY + 4, { width: 100 });
          doc.text(String(task.status || "—"), leftMargin + 275, currentY + 4, { width: 65 });
          doc.text(String(task.priority || "—"), leftMargin + 345, currentY + 4, { width: 55 });
          doc.text(String(task.dueDate || "—").slice(0, 10), leftMargin + 405, currentY + 4, { width: 60 });
          doc.fillColor(task.isOverdue === "YES" ? "#DC2626" : "#059669").text(String(task.isOverdue), leftMargin + 470, currentY + 4, { width: 45 });
          currentY += 15;
        });
      }

      // --- EMPLOYEES SECTION ---
      if (scope === "employees" || scope === "all") {
        doc
          .fillColor("#063D63")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("EMPLOYEE DIRECTORY", leftMargin, currentY);
        currentY += 16;

        const drawEmpHeader = (y: number) => {
          doc.rect(leftMargin, y, contentWidth, 18).fill("#087D8F");
          doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica-Bold");
          doc.text("ID", leftMargin + 6, y + 5, { width: 50 });
          doc.text("NAME", leftMargin + 58, y + 5, { width: 100 });
          doc.text("EMAIL", leftMargin + 160, y + 5, { width: 120 });
          doc.text("DEPT", leftMargin + 282, y + 5, { width: 80 });
          doc.text("ROLE", leftMargin + 364, y + 5, { width: 50 });
          doc.text("STATUS", leftMargin + 416, y + 5, { width: 50 });
          doc.text("TASKS", leftMargin + 468, y + 5, { width: 50 });
        };

        drawEmpHeader(currentY);
        currentY += 18;

        employeeDataRows.forEach((emp, index) => {
          if (currentY > 740) {
            doc.addPage();
            currentY = 40;
            drawEmpHeader(currentY);
            currentY += 18;
          }

          if (index % 2 === 1) {
            doc.rect(leftMargin, currentY, contentWidth, 16).fill("#F8FAFC");
          }

          doc.fillColor("#334155").fontSize(7).font("Helvetica");
          doc.text(
            String(emp.employeeId || "—").slice(0, 12),
            leftMargin + 6,
            currentY + 4,
            { width: 50 },
          );
          doc.text(
            String(emp.fullName || "—").slice(0, 22),
            leftMargin + 58,
            currentY + 4,
            { width: 100 },
          );
          doc.text(
            String(emp.email || "—").slice(0, 26),
            leftMargin + 160,
            currentY + 4,
            { width: 120 },
          );
          doc.text(
            String(emp.department || "—").slice(0, 16),
            leftMargin + 282,
            currentY + 4,
            { width: 80 },
          );
          doc.text(String(emp.role || "—"), leftMargin + 364, currentY + 4, {
            width: 50,
          });
          doc.text(String(emp.status || "—"), leftMargin + 416, currentY + 4, {
            width: 50,
          });
          doc.text(
            `${emp.taskCount || 0} (${emp.completionPercentage || "0%"})`,
            leftMargin + 468,
            currentY + 4,
            { width: 50 },
          );

          currentY += 16;
        });

        currentY += 20;
      }

      // --- TASKS SECTION ---
      if (scope === "tasks" || scope === "all") {
        if (scope === "all" && currentY > 500) {
          doc.addPage();
          currentY = 40;
        }

        doc
          .fillColor("#063D63")
          .fontSize(11)
          .font("Helvetica-Bold")
          .text("TASK DIRECTORY", leftMargin, currentY);
        currentY += 16;

        const drawTaskHeader = (y: number) => {
          doc.rect(leftMargin, y, contentWidth, 18).fill("#087D8F");
          doc.fillColor("#FFFFFF").fontSize(7.5).font("Helvetica-Bold");
          doc.text("TITLE", leftMargin + 6, y + 5, { width: 150 });
          doc.text("ASSIGNEE", leftMargin + 160, y + 5, { width: 100 });
          doc.text("STATUS", leftMargin + 265, y + 5, { width: 65 });
          doc.text("PRIORITY", leftMargin + 335, y + 5, { width: 55 });
          doc.text("DUE DATE", leftMargin + 395, y + 5, { width: 65 });
          doc.text("CREATED", leftMargin + 465, y + 5, { width: 55 });
        };

        drawTaskHeader(currentY);
        currentY += 18;

        taskDataRows.forEach((task, index) => {
          if (currentY > 740) {
            doc.addPage();
            currentY = 40;
            drawTaskHeader(currentY);
            currentY += 18;
          }

          if (index % 2 === 1) {
            doc.rect(leftMargin, currentY, contentWidth, 16).fill("#F8FAFC");
          }

          doc.fillColor("#334155").fontSize(7).font("Helvetica");
          doc.text(
            String(task.title || "—").slice(0, 30),
            leftMargin + 6,
            currentY + 4,
            { width: 150 },
          );
          doc.text(
            String(task.assignedEmployee || "—").slice(0, 20),
            leftMargin + 160,
            currentY + 4,
            { width: 100 },
          );
          doc.text(String(task.status || "—"), leftMargin + 265, currentY + 4, {
            width: 65,
          });
          doc.text(
            String(task.priority || "—"),
            leftMargin + 335,
            currentY + 4,
            { width: 55 },
          );
          doc.text(
            String(task.dueDate || "—").slice(0, 10),
            leftMargin + 395,
            currentY + 4,
            { width: 65 },
          );
          doc.text(
            String(task.createdDate || "—").slice(0, 10),
            leftMargin + 465,
            currentY + 4,
            { width: 55 },
          );

          currentY += 16;
        });
      }

      // Finalize Page Footers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.rect(leftMargin, 790, contentWidth, 0.5).fill("#DDE7EB");
        doc
          .fillColor("#8A9CA5")
          .fontSize(7.5)
          .font("Helvetica")
          .text(
            "MindMatrix Workforce Management · Internal Confidential Report",
            leftMargin,
            798,
            { width: 300 },
          );
        doc.text(`Page ${i + 1} of ${range.count}`, leftMargin, 798, {
          width: contentWidth,
          align: "right",
        });
      }

      doc.end();
      await new Promise<void>((resolve, reject) => {
        doc.on("end", () => {
          const finalPdf = Buffer.concat(pdfChunks);
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${pdfFileName}"`,
          );
          res.setHeader("Content-Length", String(finalPdf.length));
          res.end(finalPdf);
          resolve();
        });
        doc.on("error", reject);
      });
      return;
    }

    // ===================================================
    // EXCEL (.xlsx) FORMAT
    // ===================================================
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MindMatrix Task Manager";
    workbook.created = new Date();

    const headerStyle = {
      font: {
        name: "Arial",
        size: 11,
        bold: true,
        color: { argb: "FFFFFFFF" },
      },
      fill: {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: "FF063D63" },
      },
      alignment: { vertical: "middle" as const, horizontal: "left" as const },
    };

    // 1. Reports Worksheets
    if (scope === "reports") {
      // Sheet 1: Executive Summary
      const summarySheet = workbook.addWorksheet("Executive Summary", {
        views: [{ showGridLines: true }],
      });

      summarySheet.columns = [
        { header: "Metric", key: "metric", width: 28 },
        { header: "Value", key: "value", width: 35 },
      ];

      const s = reportData.summary;
      const metricsList = [
        { metric: "Report Scope", value: s.scope },
        { metric: "Generated Date", value: todayStr },
        { metric: "Total Deliverables", value: s.totalTasks },
        { metric: "Completed Tasks", value: s.completedTasks },
        { metric: "In Progress Tasks", value: s.inProgressTasks },
        { metric: "Pending Tasks", value: s.pendingTasks },
        { metric: "Overdue Tasks", value: s.overdueTasks },
        { metric: "Overall Completion Rate", value: s.completionRate },
        { metric: "On-Time Delivery Rate", value: s.onTimeRate },
        { metric: "Priority - Urgent", value: reportData.priorityBreakdown.URGENT || 0 },
        { metric: "Priority - High", value: reportData.priorityBreakdown.HIGH || 0 },
        { metric: "Priority - Medium", value: reportData.priorityBreakdown.MEDIUM || 0 },
        { metric: "Priority - Low", value: reportData.priorityBreakdown.LOW || 0 },
      ];

      summarySheet.getRow(1).height = 28;
      summarySheet.getRow(1).eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
        cell.alignment = headerStyle.alignment;
      });

      metricsList.forEach((m, idx) => {
        const row = summarySheet.addRow(m);
        row.height = 22;
        if (idx % 2 === 1) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF7FAFC" },
            };
          });
        }
      });

      // Sheet 2: Department Performance
      const deptSheet = workbook.addWorksheet("Department Performance", {
        views: [{ showGridLines: true }],
      });
      deptSheet.columns = [
        { header: "Department", key: "department", width: 24 },
        { header: "Total Tasks", key: "totalTasks", width: 14 },
        { header: "Completed", key: "completedTasks", width: 14 },
        { header: "In Progress", key: "inProgressTasks", width: 14 },
        { header: "Pending", key: "pendingTasks", width: 14 },
        { header: "Overdue", key: "overdueTasks", width: 14 },
        { header: "Completion Rate", key: "completionRate", width: 18 },
      ];

      deptSheet.getRow(1).height = 28;
      deptSheet.getRow(1).eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
        cell.alignment = headerStyle.alignment;
      });

      reportData.departmentBreakdown.forEach((dept: any, idx: number) => {
        const row = deptSheet.addRow(dept);
        row.height = 22;
        if (idx % 2 === 1) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF7FAFC" },
            };
          });
        }
      });

      // Sheet 3: Task Deliverables
      const tasksSheet = workbook.addWorksheet("Task Deliverables", {
        views: [{ showGridLines: true }],
      });
      tasksSheet.columns = [
        { header: "Task ID", key: "taskId", width: 24 },
        { header: "Title", key: "title", width: 32 },
        { header: "Description", key: "description", width: 40 },
        { header: "Assignee", key: "assignee", width: 22 },
        { header: "Department", key: "department", width: 18 },
        { header: "Status", key: "status", width: 16 },
        { header: "Priority", key: "priority", width: 14 },
        { header: "Due Date", key: "dueDate", width: 20 },
        { header: "Completed Date", key: "completedAt", width: 20 },
        { header: "Created Date", key: "createdAt", width: 20 },
        { header: "Overdue", key: "isOverdue", width: 12 },
      ];

      tasksSheet.getRow(1).height = 28;
      tasksSheet.getRow(1).eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
        cell.alignment = headerStyle.alignment;
      });

      reportData.tasks.forEach((t: any, idx: number) => {
        const row = tasksSheet.addRow(t);
        row.height = 22;
        if (idx % 2 === 1) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF7FAFC" },
            };
          });
        }
      });
    }

    // 2. Employees Sheet (if employees or all)
    if (scope === "employees" || scope === "all") {
      const empSheet = workbook.addWorksheet("Employees", {
        views: [{ showGridLines: true }],
      });

      empSheet.columns = [
        { header: "Employee ID", key: "employeeId", width: 16 },
        { header: "First Name", key: "firstName", width: 16 },
        { header: "Last Name", key: "lastName", width: 16 },
        { header: "Full Name", key: "fullName", width: 22 },
        { header: "Email", key: "email", width: 28 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Department", key: "department", width: 18 },
        { header: "Designation", key: "designation", width: 20 },
        { header: "Role", key: "role", width: 14 },
        { header: "Status", key: "status", width: 12 },
        { header: "Task Count", key: "taskCount", width: 12 },
        { header: "Completed Tasks", key: "completedTasks", width: 16 },
        { header: "Completion Rate", key: "completionPercentage", width: 16 },
        { header: "Created Date", key: "createdDate", width: 20 },
        { header: "Updated Date", key: "updatedDate", width: 20 },
      ];

      empSheet.getRow(1).height = 28;
      empSheet.getRow(1).eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
        cell.alignment = headerStyle.alignment;
      });

      employeeDataRows.forEach((row, idx) => {
        const addedRow = empSheet.addRow(row);
        addedRow.height = 22;
        if (idx % 2 === 1) {
          addedRow.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF7FAFC" },
            };
          });
        }
      });
    }

    // 3. Tasks Sheet (if tasks or all)
    if (scope === "tasks" || scope === "all") {
      const taskSheet = workbook.addWorksheet("Tasks", {
        views: [{ showGridLines: true }],
      });

      taskSheet.columns = [
        { header: "Task ID", key: "taskId", width: 26 },
        { header: "Title", key: "title", width: 30 },
        { header: "Description", key: "description", width: 40 },
        { header: "Assigned Employee", key: "assignedEmployee", width: 22 },
        { header: "Employee ID", key: "assignedEmployeeId", width: 16 },
        { header: "Employee Email", key: "assignedEmployeeEmail", width: 26 },
        { header: "Status", key: "status", width: 16 },
        { header: "Priority", key: "priority", width: 14 },
        { header: "Due Date", key: "dueDate", width: 20 },
        { header: "Completed Date", key: "completedAt", width: 20 },
        { header: "Created Date", key: "createdDate", width: 20 },
        { header: "Updated Date", key: "updatedDate", width: 20 },
      ];

      taskSheet.getRow(1).height = 28;
      taskSheet.getRow(1).eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
        cell.alignment = headerStyle.alignment;
      });

      taskDataRows.forEach((row, idx) => {
        const addedRow = taskSheet.addRow(row);
        addedRow.height = 22;
        if (idx % 2 === 1) {
          addedRow.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF7FAFC" },
            };
          });
        }
      });
    }

    const excelFileName =
      scope === "employees"
        ? `employees_${todayStr}.xlsx`
        : scope === "tasks"
          ? `tasks_${todayStr}.xlsx`
          : scope === "reports"
            ? `performance_report_${todayStr}.xlsx`
            : `mindmatrix_export_${todayStr}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${excelFileName}"`,
    );

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Length", String(buffer.byteLength));
    res.end(Buffer.from(buffer));
  } catch (error: any) {
    console.error("Export Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error?.message || "Unable to export data. Please try again.",
      });
    }
  }
};
