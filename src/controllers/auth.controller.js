const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { connectDb } = require("../config/db");
const { clearAuthCookie, setAuthCookie, signToken } = require("../middlewares/auth");
const { verifyGoogleIdToken } = require("../services/google.service");

function publicUser(user) {
  const { passwordHash, ...safeUser } = user;
  return { ...safeUser, _id: safeUser._id.toString() };
}

async function register(req, res) {
  const { name, email, password, photoURL, role } = req.validated;
  const users = (await connectDb()).collection("users");
  const normalizedEmail = email.toLowerCase();
  if (await users.findOne({ email: normalizedEmail })) return res.status(409).json({ success: false, message: "An account already exists for this email" });
  const now = new Date();
  const user = { name, email: normalizedEmail, photoURL: photoURL || undefined, role: role || "tenant", provider: "credentials", passwordHash: await bcrypt.hash(password, 12), createdAt: now, updatedAt: now };
  const result = await users.insertOne(user);
  const created = { ...user, _id: result.insertedId };
  setAuthCookie(res, signToken(result.insertedId.toString()));
  return res.status(201).json({ success: true, message: "Account created successfully", data: publicUser(created) });
}

async function login(req, res) {
  const { email, password } = req.validated;
  const user = await (await connectDb()).collection("users").findOne({ email: email.toLowerCase() });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ success: false, message: "Email or password is incorrect" });
  setAuthCookie(res, signToken(user._id.toString()));
  return res.json({ success: true, message: "Welcome back", data: publicUser(user) });
}

async function socialLogin(req, res) {
  const { name, email, photoURL } = await verifyGoogleIdToken(req.validated.idToken);
  const users = (await connectDb()).collection("users");
  const now = new Date();
  await users.updateOne({ email: email.toLowerCase() }, { $setOnInsert: { name, email: email.toLowerCase(), photoURL, role: "tenant", provider: "google", createdAt: now }, $set: { updatedAt: now, ...(photoURL ? { photoURL } : {}) } }, { upsert: true });
  const user = await users.findOne({ email: email.toLowerCase() });
  setAuthCookie(res, signToken(user._id.toString()));
  return res.json({ success: true, message: "Signed in successfully", data: publicUser(user) });
}

function me(req, res) { return res.json({ success: true, data: publicUser(req.user) }); }
function logout(_req, res) { clearAuthCookie(res); return res.json({ success: true, message: "Signed out successfully" }); }

async function updateProfile(req, res) {
  const { name, photoURL, phone } = req.validated;
  const update = { updatedAt: new Date(), ...(name ? { name } : {}), ...(photoURL !== undefined ? { photoURL: photoURL || undefined } : {}), ...(phone !== undefined ? { phone: phone || undefined } : {}) };
  const users = (await connectDb()).collection("users");
  await users.updateOne({ _id: new ObjectId(req.user._id) }, { $set: update });
  const user = await users.findOne({ _id: new ObjectId(req.user._id) });
  return res.json({ success: true, message: "Profile updated", data: publicUser(user) });
}

module.exports = { register, login, socialLogin, me, logout, updateProfile };
