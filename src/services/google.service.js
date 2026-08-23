const { OAuth2Client } = require("google-auth-library");
const { env } = require("../config/env");

async function verifyGoogleIdToken(idToken) {
  if (!env.GOOGLE_CLIENT_ID) {
    const error = new Error("Google sign-in is not configured. Add GOOGLE_CLIENT_ID to the server environment.");
    error.status = 503;
    throw error;
  }
  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const profile = ticket.getPayload();
  if (!profile?.email || !profile.email_verified) {
    const error = new Error("Google did not verify an email address for this account");
    error.status = 401;
    throw error;
  }
  return { name: profile.name || profile.email.split("@")[0], email: profile.email, photoURL: profile.picture || undefined };
}

module.exports = { verifyGoogleIdToken };
