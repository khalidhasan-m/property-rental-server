const { betterAuth } = require("better-auth");
const { mongodbAdapter } = require("better-auth/adapters/mongodb");
const { connectDb } = require("./db");
const { env } = require("./env");

let authInstance = null;

async function getAuth() {
  if (authInstance) return authInstance;
  const db = await connectDb();
  authInstance = betterAuth({
    database: mongodbAdapter(db),
    secret: env.JWT_SECRET,
    baseURL: `http://localhost:${env.PORT}`,
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
  });
  return authInstance;
}

module.exports = { getAuth };
