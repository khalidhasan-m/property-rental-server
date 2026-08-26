const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { connectDb } = require("../config/db");
const { clearAuthCookie, setAuthCookie, signToken } = require("../middlewares/auth");
const { verifyGoogleIdToken } = require("../services/google.service");

function publicUser(user, token) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return { ...safeUser, _id: safeUser._id.toString(), ...(token ? { token } : {}) };
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
  const token = signToken(result.insertedId.toString());
  setAuthCookie(res, token);
  return res.status(201).json({ success: true, message: "Account created successfully", data: publicUser(created) });
}

async function login(req, res) {
  const { email, password } = req.validated;
  const user = await (await connectDb()).collection("users").findOne({ email: email.toLowerCase() });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ success: false, message: "Email or password is incorrect" });
  const token = signToken(user._id.toString());
  setAuthCookie(res, token);
  return res.json({ success: true, message: "Welcome back", data: publicUser(user) });
}

async function socialLogin(req, res) {
  const { name, email, photoURL } = await verifyGoogleIdToken(req.validated.idToken);
  const users = (await connectDb()).collection("users");
  const now = new Date();
  await users.updateOne({ email: email.toLowerCase() }, { $setOnInsert: { name, email: email.toLowerCase(), photoURL, role: "tenant", provider: "google", createdAt: now }, $set: { updatedAt: now, ...(photoURL ? { photoURL } : {}) } }, { upsert: true });
  const user = await users.findOne({ email: email.toLowerCase() });
  const token = signToken(user._id.toString());
  setAuthCookie(res, token);
  return res.json({ success: true, message: "Signed in successfully", data: publicUser(user) });
}

function me(req, res) { return res.json({ success: true, data: publicUser(req.user) }); }
function logout(_req, res) { clearAuthCookie(res); return res.json({ success: true, message: "Signed out successfully" }); }

/**
 * Called from the client's /auth/callback page after a successful Google OAuth
 * redirect. Better Auth sets its own session cookie; this endpoint upserts the
 * user into our `users` collection (with role="tenant" by default) and returns
 * the user object so the client can populate AuthContext.
 *
 * No JWT is required — the Better Auth session cookie validates the caller.
 */
async function socialSync(req, res) {
  const auth = await (require("../config/auth").getAuth());
  // Verify caller has a valid Better Auth session
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!session?.user) return res.status(401).json({ success: false, message: "No valid session found" });

  const email = session.user.email?.toLowerCase();
  if (!email) return res.status(400).json({ success: false, message: "Session email missing" });
  // Derive name and photoURL from the verified Better Auth session only
  const resolvedName = session.user.name || email.split("@")[0];
  const resolvedPhotoURL = session.user.image || session.user.photoURL || undefined;

  const users = (await connectDb()).collection("users");
  const now = new Date();

  await users.updateOne(
    { email: email.toLowerCase() },
    {
      $setOnInsert: {
        email: email.toLowerCase(),
        role: "tenant",
        provider: "google",
        createdAt: now,
      },
      $set: {
        updatedAt: now,
        name: resolvedName,
        // Always sync the latest Google photo for both new and returning users
        ...(resolvedPhotoURL ? { photoURL: resolvedPhotoURL } : {}),
      },
    },
    { upsert: true }
  );

  const user = await users.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(500).json({ success: false, message: "Failed to sync user" });

  // Issue our own JWT so subsequent API calls can use Bearer token
  const token = signToken(user._id.toString());
  setAuthCookie(res, token);
  return res.json({ success: true, message: "Signed in with Google", data: publicUser(user) });
}

async function updateProfile(req, res) {
  const { name, photoURL, phone } = req.validated;
  const update = { updatedAt: new Date() };
  if (name) update.name = name;
  if (photoURL !== undefined) update.photoURL = photoURL;
  if (phone !== undefined) update.phone = phone;

  const users = (await connectDb()).collection("users");

  // Prefer lookup by email since it's universally unique in our app.
  // This avoids issues where Better Auth IDs might accidentally parse as ObjectIds.
  const filter = req.user.email 
    ? { email: req.user.email.toLowerCase() } 
    : { _id: new ObjectId(req.user._id) };

  await users.updateOne(filter, { $set: update });
  const user = await users.findOne(filter);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  return res.json({ success: true, message: "Profile updated", data: publicUser(user) });
}


module.exports = { register, login, socialLogin, socialSync, me, logout, updateProfile };
