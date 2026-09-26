import express from "express";

import {
  globalSearch,
} from "../controllers/search.controller.js";

import {
  authenticate,
} from "../middlewares/auth.middleware.js";

import {
  authorize,
} from "../middlewares/role.middleware.js";

const router =
  express.Router();

// =====================================================
// GLOBAL SEARCH
// ADMIN ONLY
// =====================================================

router.get(
  "/",
  authenticate,
  authorize("admin"),
  globalSearch
);

export default router;