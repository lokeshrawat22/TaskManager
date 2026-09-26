import express, { Application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";

// Routes
import authRoutes from "./routes/auth.routes.js";
import taskRoutes from "./routes/task.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import userRoutes from "./routes/user.routes.js";
import searchRoutes from "./routes/search.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import exportRoutes from "./routes/export.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import masterDataRoutes from "./routes/masterData.routes.js";
// Middleware
import { errorHandler } from "./middlewares/error.middleware.js";
import { csrfProtection, getAllowedOrigins } from "./middlewares/csrf.middleware.js";

const app: Application = express();

// =====================================================
// SECURITY HEADERS (HELMET)
// =====================================================

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
    hsts:
      process.env.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
    frameguard: { action: "deny" },
    noSniff: true,
  })
);

// =====================================================
// CORS CONFIGURATION
// =====================================================

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = getAllowedOrigins();
    const isAllowed = allowedOrigins.some((allowed) => {
      try {
        return new URL(allowed).origin === new URL(origin).origin;
      } catch {
        return allowed === origin;
      }
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS origin not allowed: ${origin}`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "X-Login-Key-Id",
    "x-login-key-id",
    "X-CSRF-Token",
    "x-csrf-token",
  ],
};

app.use(cors(corsOptions));

// =====================================================
// BODY PARSER
// =====================================================

app.use(express.json());

// =====================================================
// COOKIE PARSER
// =====================================================

app.use(cookieParser());

// =====================================================
// CSRF PROTECTION
// =====================================================

app.use("/api", csrfProtection);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Task Manager API running",
  });
});

app.get("/health", (_req, res) => {
  const isConnected = mongoose.connection.readyState === 1;

  if (isConnected) {
    res.status(200).json({
      status: "UP",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: "DOWN",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// =====================================================
// API ROUTES
// =====================================================

app.use("/api/auth", authRoutes);

app.use("/api/tasks", taskRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/users", userRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/admin", masterDataRoutes);
app.use("/api", masterDataRoutes);

app.use("/api/search", searchRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/export", exportRoutes);


// =====================================================
// ERROR HANDLER
// =====================================================

app.use(errorHandler);

export default app;
