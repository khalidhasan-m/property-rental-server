const { z } = require("zod");

const propertyFields = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(30).max(3000),
  location: z.string().trim().min(2).max(140),
  propertyType: z.string().trim().min(2).max(60),
  rent: z.coerce.number().positive(),
  rentType: z.enum(["monthly", "weekly", "daily"]),
  bedrooms: z.coerce.number().int().min(0).max(50),
  bathrooms: z.coerce.number().int().min(0).max(50),
  propertySize: z.coerce.number().positive().max(100000),
  amenities: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  images: z.array(z.string().url()).min(1).max(8),
  extraFeatures: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
});

const createPropertySchema = propertyFields;
const updatePropertySchema = propertyFields.partial();
const propertyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  propertyType: z.string().trim().max(60).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
  status: z.enum(["pending", "approved", "rejected", "all"]).optional(),
});
const idParamSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier") });
const moderatePropertySchema = z.object({ status: z.enum(["approved", "rejected"]), rejectionFeedback: z.string().trim().min(5).max(600).optional() }).superRefine((data, ctx) => { if (data.status === "rejected" && !data.rejectionFeedback) ctx.addIssue({ code: "custom", path: ["rejectionFeedback"], message: "Rejection feedback is required" }); });

module.exports = { createPropertySchema, updatePropertySchema, propertyQuerySchema, idParamSchema, moderatePropertySchema };
