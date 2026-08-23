const axios = require("axios");
const { env } = require("../config/env");

async function uploadImage(base64Image) {
  if (!env.IMGBB_API_KEY) {
    const error = new Error("Image uploads are not configured. Add IMGBB_API_KEY to the server environment.");
    error.status = 503;
    throw error;
  }
  const form = new URLSearchParams({ key: env.IMGBB_API_KEY, image: base64Image.replace(/^data:image\/\w+;base64,/, "") });
  const { data } = await axios.post("https://api.imgbb.com/1/upload", form, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  return data.data.url;
}

module.exports = { uploadImage };
