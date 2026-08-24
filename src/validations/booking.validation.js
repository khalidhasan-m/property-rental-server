const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const createBookingSchema = z.object({
  propertyId: objectId,
  moveInDate: z.coerce.date().refine((date) => date > new Date(), "Move-in date must be in the future"),
  contactNumber: z.string().trim().min(6).max(30),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
const bookingIdSchema = z.object({ id: objectId });
const bookingDecisionSchema = z.object({ bookingStatus: z.enum(["approved", "rejected"]) });
const paymentIntentSchema = z.object({ bookingId: objectId });
const confirmPaymentSchema = z.object({ bookingId: objectId, paymentIntentId: z.string().min(5) });
const favoriteSchema = z.object({ propertyId: objectId });
const reviewSchema = z.object({ propertyId: objectId, rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().min(3).max(800) });
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

module.exports = { createBookingSchema, bookingIdSchema, bookingDecisionSchema, paymentIntentSchema, confirmPaymentSchema, favoriteSchema, reviewSchema, paginationSchema };
