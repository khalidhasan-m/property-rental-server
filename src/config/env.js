require("dotenv").config();
const { z } = require("zod");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB: z.string().default("property_rental"),
  JWT_SECRET: z.string().min(24, "JWT_SECRET must be at least 24 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().refine((value) => value.split(",").every((url) => z.string().url().safeParse(url.trim()).success), "CLIENT_URL must contain valid URL values separated by commas").default("http://localhost:3000"),
  STRIPE_SECRET_KEY: z.string().optional(),
  IMGBB_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
});

const env = envSchema.parse(process.env);
module.exports = { env };
