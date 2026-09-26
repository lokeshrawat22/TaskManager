import { Router } from "express";
import { exportData } from "../controllers/export.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";

const router = Router();

// =====================================================
// ALL EXPORT ROUTES REQUIRE AUTHENTICATION & ADMIN ROLE
// =====================================================
router.use(authenticate);
router.use(authorize("admin"));

// GET /api/export
// Query params: scope (employees|tasks|all), format (csv|xlsx|json)
router.get("/", exportData);
router.get("/data", exportData);

export default router;
