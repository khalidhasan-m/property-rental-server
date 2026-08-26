const { z } = require("zod");
const { uploadImage } = require("../services/imgbb.service");
const sharp = require("sharp");
// Configuration for server-side image validation
const MAX_IMAGE_COUNT = 8;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB per image
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]; // extend as needed
const MAX_IMAGE_WIDTH = 2000; // pixels
const MAX_IMAGE_HEIGHT = 2000; // pixels

const uploadSchema = z.object({ images: z.array(z.string().min(100)).min(1).max(MAX_IMAGE_COUNT) });
const avatarSchema = z.object({ image: z.string().min(100, "Provide a valid base64 image") });

async function uploadImages(req, res) {
  // Enforce maximum total payload size based on image limits
  const MAX_TOTAL_SIZE = MAX_IMAGE_COUNT * MAX_IMAGE_SIZE; // e.g., 8 * 5MB = 40MB
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_TOTAL_SIZE) {
    return res.status(413).json({ success: false, message: `Payload exceeds maximum allowed size of ${MAX_TOTAL_SIZE / (1024 * 1024)} MB` });
  }

  // Basic schema validation for presence and count
  const result = uploadSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: "Provide between one and eight base64 image files" });
  }

  const images = result.data.images;
  // Validate each image server‑side
  try {
    const validatedBuffers = await Promise.all(
      images.map(async (base64Img) => {
        // Extract MIME type and base64 data
        const match = base64Img.match(/^data:(image\/[^;]+);base64,(.*)$/);
        if (!match) {
          throw new Error("Invalid data URL format");
        }
        const mime = match[1];
        const data = match[2];
        if (!ALLOWED_MIME_TYPES.includes(mime)) {
          throw new Error(`Unsupported image type: ${mime}`);
        }
        const buffer = Buffer.from(data, "base64");
        if (buffer.length > MAX_IMAGE_SIZE) {
          throw new Error(`Image exceeds maximum size of ${MAX_IMAGE_SIZE / (1024 * 1024)} MB`);
        }
        const metadata = await sharp(buffer).metadata();
        if (metadata.width > MAX_IMAGE_WIDTH || metadata.height > MAX_IMAGE_HEIGHT) {
          throw new Error(`Image dimensions exceed ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT}px`);
        }
        return buffer.toString("base64"); // return clean base64 without data URL header
      })
    );
    // Upload validated images
    const urls = await Promise.all(validatedBuffers.map(uploadImage));
    return res.status(201).json({ success: true, message: "Images uploaded", data: urls });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Invalid image data" });
  }
}

async function uploadAvatar(req, res) {
  const result = avatarSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, message: result.error.errors[0]?.message || "Invalid image" });
  }
  const base64Img = result.data.image;
  try {
    const match = base64Img.match(/^data:(image\/[^;]+);base64,(.*)$/);
    if (!match) throw new Error("Invalid data URL format");
    const mime = match[1];
    if (!ALLOWED_MIME_TYPES.includes(mime)) throw new Error(`Unsupported image type: ${mime}`);
    const data = match[2];
    const buffer = Buffer.from(data, "base64");
    if (buffer.length > MAX_IMAGE_SIZE) throw new Error(`Image exceeds maximum size of ${MAX_IMAGE_SIZE / (1024 * 1024)} MB`);
    const metadata = await sharp(buffer).metadata();
    if (metadata.width > MAX_IMAGE_WIDTH || metadata.height > MAX_IMAGE_HEIGHT) {
      throw new Error(`Image dimensions exceed ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT}px`);
    }
    // Use cleaned base64 (no data URL header) for upload
    const cleanBase64 = buffer.toString("base64");
    const url = await uploadImage(cleanBase64);
    return res.status(201).json({ success: true, message: "Avatar uploaded", data: url });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Invalid image data" });
  }
}

module.exports = { uploadImages, uploadAvatar };
