const { z } = require("zod");

const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(10), search: z.string().trim().max(100).optional() });
const roleSchema = z.object({ role: z.enum(["tenant", "owner", "admin"]) });

module.exports = { pageSchema, roleSchema };
