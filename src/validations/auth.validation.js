const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(6).max(128),
  photoURL: z.string().url().optional().or(z.literal("")),
  role: z.enum(["tenant", "owner"]).optional(),
});

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(6).max(128) });
const socialLoginSchema = z.object({ idToken: z.string().min(20) });
const socialSyncSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(120).optional(),
  photoURL: z.string().url().optional().or(z.literal("")),
});
const profileSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), photoURL: z.string().url().optional().or(z.literal("")), phone: z.string().trim().min(6).max(30).optional().or(z.literal("")) });

module.exports = { registerSchema, loginSchema, socialLoginSchema, socialSyncSchema, profileSchema };
