const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { env } = require("../config/env");
const { connectDb } = require("../config/db");

function signToken(userId) {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.accessToken;
    if (!token) return res.status(401).json({ success: false, message: "Authentication is required" });
    const { userId } = jwt.verify(token, env.JWT_SECRET);
    const database = await connectDb();
    const user = await database.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(401).json({ success: false, message: "Session is no longer valid" });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ success: false, message: "You do not have permission for this action" });
    return next();
  };
}

function setAuthCookie(res, token) {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE === "true" || env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearAuthCookie(res) {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: env.COOKIE_SECURE === "true" || env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
}

module.exports = { signToken, requireAuth, requireRole, setAuthCookie, clearAuthCookie };
