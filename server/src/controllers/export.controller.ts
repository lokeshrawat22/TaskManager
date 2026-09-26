import PDFDocument from "pdfkit";
import { Request, Response } from "express";
import ExcelJS from "exceljs";
import User, { IUser } from "../models/user.model.js";
import Task, { ITask } from "../models/task.model.js";
import { getEmployeeRoleFilter } from "../services/employee.service.js";

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
    const scope = (req.query.scope as string) || "all"; // employees | tasks | all
    const format = (req.query.format as string) || "xlsx"; // csv | xlsx | json
    const todayStr = getTodayString();

    // ---------------------------------------------------
    // 1. FETCH & PROCESS EMPLOYEES DATA
    // ---------------------------------------------------
    let employeeDataRows: any[] = [];
    if (scope === "employees" || scope === "all") {
      // Query users (all employees/workforce members)
      const employeeQuery: any = getEmployeeRoleFilter();

      // Optional filters if passed by client
      if (req.query.status && req.query.status !== "ALL") {
        if (req.query.status === "Active") employeeQuery.isBlocked = false;
        else if (req.query.status === "Inactive")
          employeeQuery.isBlocked = true;
      }
      if (req.query.department && req.query.department !== "ALL") {
        employeeQuery.department = req.query.department;
      }
      if (req.query.employeeRole && req.query.employeeRole !== "ALL") {
        employeeQuery.role = req.query.employeeRole;
      }
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
    // 2. FETCH & PROCESS TASKS DATA
    // ---------------------------------------------------
    let taskDataRows: any[] = [];
    if (scope === "tasks" || scope === "all") {
      const taskQuery: any = {};

      if (req.query.taskStatus && req.query.taskStatus !== "ALL") {
        taskQuery.status = req.query.taskStatus;
      }
      if (req.query.taskPriority && req.query.taskPriority !== "ALL") {
        taskQuery.priority = req.query.taskPriority;
      }
      if (req.query.assignee && req.query.assignee !== "ALL") {
        taskQuery.assignedTo = req.query.assignee;
      }
      if (req.query.taskIds) {
        const idList = (req.query.taskIds as string)
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

    // Check if there is data
    const totalRecords = employeeDataRows.length + taskDataRows.length;
    if (totalRecords === 0) {
      res.status(404).json({
        success: false,
        message: "No data available to export.",
      });
      return;
    }

    // ---------------------------------------------------
    // 3. FORMAT DISPATCHER
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
            : `mindmatrix_export_${todayStr}.json`;

      let outputData: any = {};
      if (scope === "employees") {
        outputData = employeeDataRows;
      } else if (scope === "tasks") {
        outputData = taskDataRows;
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
      // If scope is employees
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

      // If scope is tasks
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

      // If scope is all: Provide structured CSV with sections
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
            : `mindmatrix_export_${todayStr}.pdf`;

      const doc = new PDFDocument({
        margin: 36,
        size: "A4",
        bufferPages: true,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${pdfFileName}"`,
      );

      doc.pipe(res);

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
          `OFFICIAL DATA EXPORT REPORT  ·  GENERATED ON ${todayStr}`,
          leftMargin + 16,
          67,
        );

      // Metadata summary strip
      doc.rect(leftMargin, 94, contentWidth, 24).fill("#F4F9FB");
      doc
        .fillColor("#536B77")
        .fontSize(8)
        .font("Helvetica-Bold")
        .text(`SCOPE: ${scope.toUpperCase()}`, leftMargin + 12, 102);
      doc.text(`EMPLOYEES: ${employeeDataRows.length}`, leftMargin + 150, 102);
      doc.text(`TASKS: ${taskDataRows.length}`, leftMargin + 270, 102);
      doc.text(`CONFIDENTIAL & PROPRIETARY`, leftMargin + 380, 102);

      let currentY = 130;

      // 1. EMPLOYEES SECTION
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

      // 2. TASKS SECTION
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

    // 1. Employees Sheet
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

      // Style Header
      const headerRow = empSheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
        cell.alignment = headerStyle.alignment;
      });

      // Add Data Rows
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

    // 2. Tasks Sheet
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

      // Style Header
      const headerRow = taskSheet.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
        cell.alignment = headerStyle.alignment;
      });

      // Add Data Rows
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
          : `mindmatrix_export_${todayStr}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${excelFileName}"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error("Export Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Unable to export data. Please try again.",
    });
  }
};
