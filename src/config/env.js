require("dotenv").config();
const { z } = require("zod");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5050),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB: z.string().default("property_rental"),
  JWT_SECRET: z.string().min(24, "JWT_SECRET must be at least 24 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  SERVER_URL: z.string().default("http://localhost:5050"),
  CLIENT_URL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  IMGBB_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production" && !data.IMGBB_API_KEY) {
    ctx.addIssue({ code: "custom", path: ["IMGBB_API_KEY"], message: "IMGBB_API_KEY is required in production" });
  }
});

const env = envSchema.parse(process.env);
module.exports = { env };
