const express = require("express");
const { uploadImages, uploadAvatar } = require("../controllers/upload.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();
router.post("/images", requireAuth, requireRole("owner"), uploadImages);
router.post("/avatar", requireAuth, uploadAvatar);

module.exports = router;
