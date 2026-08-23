const express = require("express");
const controller = require("../controllers/admin.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { idParamSchema } = require("../validations/property.validation");
const { pageSchema, roleSchema } = require("../validations/admin.validation");

const router = express.Router();
router.get("/users", requireAuth, requireRole("admin"), validate(pageSchema, "query"), controller.getUsers);
router.patch("/users/:id/role", requireAuth, requireRole("admin"), validate(idParamSchema, "params"), validate(roleSchema), controller.changeRole);
router.get("/transactions", requireAuth, requireRole("admin"), validate(pageSchema, "query"), controller.getTransactions);
router.get("/owner/analytics", requireAuth, requireRole("owner"), controller.getOwnerAnalytics);

module.exports = router;
