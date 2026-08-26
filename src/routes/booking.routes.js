const express = require("express");
const controller = require("../controllers/booking.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { createBookingSchema, bookingIdSchema, bookingDecisionSchema, paymentIntentSchema, confirmPaymentSchema, paginationSchema } = require("../validations/booking.validation");

const router = express.Router();
router.post("/", requireAuth, requireRole("tenant"), validate(createBookingSchema), controller.createBooking);
router.get("/mine", requireAuth, requireRole("tenant"), controller.myBookings);
router.get("/owner", requireAuth, requireRole("owner"), validate(paginationSchema, "query"), controller.ownerBookings);
router.patch("/:id/decision", requireAuth, requireRole("owner"), validate(bookingIdSchema, "params"), validate(bookingDecisionSchema), controller.decideBooking);
router.post("/payment-intent", requireAuth, requireRole("tenant"), validate(paymentIntentSchema), controller.createPaymentIntent);
router.post("/confirm-payment", requireAuth, requireRole("tenant"), validate(confirmPaymentSchema), controller.confirmPayment);
router.get("/admin/all", requireAuth, requireRole("admin"), validate(paginationSchema, "query"), controller.adminBookings);

module.exports = router;
