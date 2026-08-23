const { MongoServerError } = require("mongodb");
const { env } = require("../config/env");

function notFound(req, res) {
  return res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} was not found` });
}

function errorHandler(error, _req, res, _next) {
  console.error(error);
  if (error instanceof MongoServerError && error.code === 11000) {
    return res.status(409).json({ success: false, message: "A record with those details already exists" });
  }
  const status = Number(error?.status) || 500;
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const message = env.NODE_ENV === "production" && safeStatus >= 500 ? "An unexpected server error occurred" : error?.message || "An unexpected error occurred";
  return res.status(safeStatus).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
