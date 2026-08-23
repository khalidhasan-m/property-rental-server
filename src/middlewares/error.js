const { MongoServerError } = require("mongodb");

function notFound(req, res) {
  return res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} was not found` });
}

function errorHandler(error, _req, res, _next) {
  console.error(error);
  if (error instanceof MongoServerError && error.code === 11000) {
    return res.status(409).json({ success: false, message: "A record with those details already exists" });
  }
  const status = Number(error?.status) || 500;
  return res.status(status >= 400 && status < 600 ? status : 500).json({ success: false, message: error?.message || "An unexpected error occurred" });
}

module.exports = { notFound, errorHandler };
