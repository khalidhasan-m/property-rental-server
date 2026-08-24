const { z } = require("zod");
const { uploadImage } = require("../services/imgbb.service");

const uploadSchema = z.object({ images: z.array(z.string().min(100)).min(1).max(8) });
const avatarSchema = z.object({ image: z.string().min(100, "Provide a valid base64 image") });

async function uploadImages(req, res) {
  const result = uploadSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, message: "Provide between one and eight base64 image files" });
  const urls = await Promise.all(result.data.images.map(uploadImage));
  return res.status(201).json({ success: true, message: "Images uploaded", data: urls });
}

async function uploadAvatar(req, res) {
  const result = avatarSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, message: result.error.errors[0]?.message || "Invalid image" });
  const url = await uploadImage(result.data.image);
  return res.status(201).json({ success: true, message: "Avatar uploaded", data: url });
}

module.exports = { uploadImages, uploadAvatar };
