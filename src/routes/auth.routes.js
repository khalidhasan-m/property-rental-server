const express = require("express");
const controller = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { registerSchema, loginSchema, socialLoginSchema, profileSchema } = require("../validations/auth.validation");

const router = express.Router();
router.post("/register", validate(registerSchema), controller.register);
router.post("/login", validate(loginSchema), controller.login);
router.post("/social-login", validate(socialLoginSchema), controller.socialLogin);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);
router.patch("/profile", requireAuth, validate(profileSchema), controller.updateProfile);

module.exports = router;
