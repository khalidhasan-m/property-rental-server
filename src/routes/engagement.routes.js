const express = require("express");
const controller = require("../controllers/engagement.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { favoriteSchema, reviewSchema, paginationSchema } = require("../validations/booking.validation");
const { idParamSchema } = require("../validations/property.validation");

const router = express.Router();
router.get("/reviews/featured", controller.getFeaturedReviews);
router.get("/favorites", requireAuth, requireRole("tenant"), validate(paginationSchema, "query"), controller.getFavorites);
router.post("/favorites", requireAuth, requireRole("tenant"), validate(favoriteSchema), controller.addFavorite);
router.delete("/favorites/:id", requireAuth, requireRole("tenant"), validate(idParamSchema, "params"), controller.removeFavorite);
router.post("/reviews", requireAuth, requireRole("tenant"), validate(reviewSchema), controller.addReview);
router.get("/reviews/:id", validate(idParamSchema, "params"), controller.getReviews);

router.get("/owners/trusted", controller.getTrustedOwners);

module.exports = router;
