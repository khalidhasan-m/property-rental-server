const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { env } = require("../config/env");
const { connectDb } = require("../config/db");
const { getAuth } = require("../config/auth");

function signToken(userId) {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function getTokenFromReq(req) {
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.substring(7).trim();
  }
  return null;
}

async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromReq(req);
    const hasAuthCookieOrHeader = token || req.headers?.authorization || req.headers?.cookie;

    if (!hasAuthCookieOrHeader) {
      return res.status(401).json({ success: false, message: "Authentication is required" });
    }

    if (token) {
      try {
        const { userId } = jwt.verify(token, env.JWT_SECRET);
        const database = await connectDb();
        const user = await database.collection("users").findOne({ _id: new ObjectId(userId) });
        if (!user) return res.status(401).json({ success: false, message: "Session is no longer valid" });
        req.user = { ...user, _id: user._id.toString() };
        return next();
      } catch (err) {
        if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
          return res.status(401).json({ success: false, message: "Invalid or expired session" });
        }
      }
    }

    try {
      const auth = await getAuth();
      const sessionData = await auth.api.getSession({
        headers: req.headers,
      });
      if (sessionData?.user) {
        const db = await connectDb();
        let userDoc = sessionData.user;
        if (userDoc.email) {
          let dbUser = await db.collection("users").findOne({ email: userDoc.email.toLowerCase() });
          if (!dbUser) {
            // Auto-sync the user to MongoDB if they bypassed the OAuth callback or db was reset
            const now = new Date();
            await db.collection("users").insertOne({
              name: userDoc.name || userDoc.email.split("@")[0],
              email: userDoc.email.toLowerCase(),
              photoURL: userDoc.image || userDoc.photoURL || undefined,
              role: "tenant",
              provider: "google",
              createdAt: now,
              updatedAt: now,
            });
            dbUser = await db.collection("users").findOne({ email: userDoc.email.toLowerCase() });
          }
          if (dbUser) userDoc = dbUser;
        }
        req.user = {
          ...userDoc,
          _id: (userDoc._id || userDoc.id)?.toString(),
          role: userDoc.role || "tenant",
        };
        req.session = sessionData.session;
        return next();
      }
    } catch {
      // Fall through to 401
    }

    return res.status(401).json({ success: false, message: "Authentication is required" });
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

module.exports = { signToken, getTokenFromReq, requireAuth, requireRole, setAuthCookie, clearAuthCookie };
