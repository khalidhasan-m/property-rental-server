const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { env } = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const propertyRoutes = require("./routes/property.routes");
const bookingRoutes = require("./routes/booking.routes");
const engagementRoutes = require("./routes/engagement.routes");
const adminRoutes = require("./routes/admin.routes");
const uploadRoutes = require("./routes/upload.routes");
const { errorHandler, notFound } = require("./middlewares/error");

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
const allowedOrigins = env.CLIENT_URL.split(",").map((url) => url.trim());
app.use(cors({ origin: allowedOrigins, credentials: true, methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.get("origin");
    if (origin && !allowedOrigins.includes(origin)) return res.status(403).json({ success: false, message: "Request origin is not allowed" });
  }
  next();
});
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.get("/", (_req, res) => res.json({ success: true, message: "Nestora API is running" }));
app.get("/api/v1/health", (_req, res) => res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } }));
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/properties", propertyRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1", engagementRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
