const express = require("express");
const controller = require("../controllers/property.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { createPropertySchema, updatePropertySchema, propertyQuerySchema, idParamSchema, moderatePropertySchema } = require("../validations/property.validation");

const router = express.Router();
router.get("/featured", controller.getFeaturedProperties);
router.get("/", validate(propertyQuerySchema, "query"), controller.getProperties);
router.get("/mine", requireAuth, requireRole("owner"), validate(propertyQuerySchema, "query"), controller.getMyProperties);
router.get("/mine/:id", requireAuth, requireRole("owner"), validate(idParamSchema, "params"), controller.getOwnProperty);
router.post("/", requireAuth, requireRole("owner"), validate(createPropertySchema), controller.createProperty);
router.get("/:id", requireAuth, validate(idParamSchema, "params"), controller.getProperty);
router.patch("/:id", requireAuth, validate(idParamSchema, "params"), validate(updatePropertySchema), controller.updateProperty);
router.delete("/:id", requireAuth, validate(idParamSchema, "params"), controller.deleteProperty);
router.get("/admin/all", requireAuth, requireRole("admin"), validate(propertyQuerySchema, "query"), controller.adminProperties);
router.patch("/admin/:id/moderate", requireAuth, requireRole("admin"), validate(idParamSchema, "params"), validate(moderatePropertySchema), controller.moderateProperty);

module.exports = router;
