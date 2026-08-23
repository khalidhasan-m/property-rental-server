const express = require("express");
const { uploadImages } = require("../controllers/upload.controller");
const { requireAuth, requireRole } = require("../middlewares/auth");

const router = express.Router();
router.post("/images", requireAuth, requireRole("owner"), uploadImages);

module.exports = router;
