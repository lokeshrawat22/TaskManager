import { Router } from "express";
import { exportData } from "../controllers/export.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";

const router = Router();

// =====================================================
// ALL EXPORT ROUTES REQUIRE AUTHENTICATION
// (Scope-based RBAC enforced inside exportData handler)
// =====================================================
router.use(authenticate);

// GET /api/export
// Query params: scope (employees|tasks|reports|all), format (csv|xlsx|json|pdf)
router.get("/", exportData);
router.get("/data", exportData);

export default router;
