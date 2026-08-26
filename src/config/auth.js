const { connectDb } = require("./db");
const { env } = require("./env");

let authInstance = null;

async function getAuth() {
  if (authInstance) return authInstance;
  const { betterAuth } = await import("better-auth");
  const { mongodbAdapter } = await import("better-auth/adapters/mongodb");
  const db = await connectDb();
  authInstance = betterAuth({
    database: mongodbAdapter(db),
    secret: env.JWT_SECRET,
    baseURL: env.SERVER_URL,
    basePath: "/api/auth",
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: env.GOOGLE_CLIENT_ID
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET || "",
          },
        }
      : {},
    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "tenant",
          required: false,
        },
        photoURL: {
          type: "string",
          required: false,
        },
        phone: {
          type: "string",
          required: false,
        },
      },
    },
    trustedOrigins: env.CLIENT_URL.split(",").map((url) => url.trim()),
    advanced: {
      cookies: {
        oauth_state: {
          attributes: {
            sameSite: env.NODE_ENV === "production" ? "none" : "lax",
            secure: env.NODE_ENV === "production",
          },
        },
      },
    },
  });
  return authInstance;
}

module.exports = { getAuth };
