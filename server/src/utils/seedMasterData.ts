import Department from "../models/department.model.js";
import Designation from "../models/designation.model.js";
import User from "../models/user.model.js";
import { DEPARTMENT_DESIGNATION_MAP } from "../constants/employee.constants.js";

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  Engineering: "Software development, architecture, infrastructure and technical operations.",
  HR: "Human resources, employee experience, talent acquisition and people operations.",
  Finance: "Financial planning, accounting, compliance, payroll and budget management.",
  Sales: "Client acquisition, business development, revenue generation and partnerships.",
  Marketing: "Brand strategy, growth marketing, market research and external communications.",
  Operations: "Business process optimization, office administration, and workflow delivery.",
  IT: "Internal technology infrastructure, equipment, helpdesk and systems administration.",
};

export const seedMasterData = async (): Promise<void> => {
  try {
    // console.log("[MasterData] Checking departments and designations master data...");

    // 1. Seed Departments
    const departmentEntries = Object.keys(DEPARTMENT_DESIGNATION_MAP);

    for (const deptName of departmentEntries) {
      let dept = await Department.findOne({
        name: { $regex: new RegExp(`^${deptName}$`, "i") },
      });

      if (!dept) {
        dept = await Department.create({
          name: deptName,
          description: DEFAULT_DESCRIPTIONS[deptName] || `${deptName} department unit.`,
          status: "ACTIVE",
        });
        // console.log(`[MasterData] Seeded Department: ${dept.name}`);
      }

      // 2. Seed Designations under this Department
      const designations = DEPARTMENT_DESIGNATION_MAP[deptName] || [];
      for (const desigName of designations) {
        const existingDesig = await Designation.findOne({
          name: { $regex: new RegExp(`^${desigName}$`, "i") },
          department: dept._id,
        });

        if (!existingDesig) {
          await Designation.create({
            name: desigName,
            department: dept._id,
            departmentName: dept.name,
            description: `${desigName} role within ${dept.name}.`,
            status: "ACTIVE",
          });
          // console.log(`[MasterData] Seeded Designation: ${desigName} (${dept.name})`);
        }
      }
    }

    // 3. Backward Compatibility Migration: Link existing Users with departmentId & designationId
    const allDepartments = await Department.find({}).lean();
    const allDesignations = await Designation.find({}).lean();

    const deptMap = new Map<string, any>();
    allDepartments.forEach((d) => {
      deptMap.set(d.name.toLowerCase().trim(), d._id);
    });

    const desigMap = new Map<string, any>();
    allDesignations.forEach((d) => {
      desigMap.set(d.name.toLowerCase().trim(), d._id);
    });

    // Find users with missing departmentId or designationId who have string values
    const usersToUpdate = await User.find({
      $or: [
        { departmentId: { $exists: false } },
        { departmentId: null },
        { designationId: { $exists: false } },
        { designationId: null },
      ],
    }).select("_id department designation departmentId designationId");

    let updatedCount = 0;
    for (const user of usersToUpdate) {
      let modified = false;

      if (user.department && !user.departmentId) {
        const dId = deptMap.get(user.department.toLowerCase().trim());
        if (dId) {
          user.departmentId = dId;
          modified = true;
        }
      }

      if (user.designation && !user.designationId) {
        const desigId = desigMap.get(user.designation.toLowerCase().trim());
        if (desigId) {
          user.designationId = desigId;
          modified = true;
        }
      }

      if (modified) {
        await user.save();
        updatedCount++;
      }
    }

    // if (updatedCount > 0) {
    //   console.log(`[MasterData] Linked relational master-data IDs to ${updatedCount} user records.`);
    // }

    // 4. Migrate and ensure normalizedName on all Departments and Designations
    const deptsNeedingNorm = await Department.find({
      $or: [{ normalizedName: { $exists: false } }, { normalizedName: "" }, { normalizedName: null }],
    });
    for (const d of deptsNeedingNorm) {
      d.name = d.name.trim().replace(/\s+/g, " ");
      (d as any).normalizedName = d.name.toLowerCase();
      await d.save();
    }

    const desigsNeedingNorm = await Designation.find({
      $or: [{ normalizedName: { $exists: false } }, { normalizedName: "" }, { normalizedName: null }],
    });
    for (const des of desigsNeedingNorm) {
      des.name = des.name.trim().replace(/\s+/g, " ");
      (des as any).normalizedName = des.name.toLowerCase();
      await des.save();
    }

    // Synchronize unique indexes safely, resolving any legacy non-unique index conflicts
    const syncModelIndexesSafely = async (model: typeof Department | typeof Designation) => {
      try {
        const indexes = await model.collection.indexes().catch(() => []);
        const normIdx = indexes.find((idx: any) => idx.name === "normalizedName_1");
        if (normIdx && !normIdx.unique) {
          await model.collection.dropIndex("normalizedName_1").catch(() => {});
        }
        await model.syncIndexes();
      } catch (e: any) {
        if (e.message?.includes("existing index has the same name") || e.code === 85 || e.code === 86) {
          try {
            await model.collection.dropIndex("normalizedName_1").catch(() => {});
            await model.syncIndexes();
          } catch {
            // Ignored if handled
          }
        }
      }
    };

    await syncModelIndexesSafely(Department);
    await syncModelIndexesSafely(Designation);

    // console.log("[MasterData] Departments and Designations initialization complete.");
  } catch (error) {
    console.error("[MasterData] Seeding error (non-fatal):", error);
  }
};
