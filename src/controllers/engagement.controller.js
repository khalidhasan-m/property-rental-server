const { ObjectId } = require("mongodb");
const { connectDb } = require("../config/db");
const { serialize } = require("../services/property.service");

async function addFavorite(req, res) {
  const database = await connectDb();
  const propertyId = new ObjectId(req.validated.propertyId);
  const property = await database.collection("properties").findOne({ _id: propertyId, status: "approved" });
  if (!property) return res.status(404).json({ success: false, message: "Property was not found" });
  await database.collection("favorites").updateOne({ tenantId: new ObjectId(req.user._id), propertyId }, { $setOnInsert: { tenantId: new ObjectId(req.user._id), propertyId, createdAt: new Date() } }, { upsert: true });
  return res.status(201).json({ success: true, message: "Added to favorites" });
}

async function getFavorites(req, res) {
  const favorites = await (await connectDb()).collection("favorites").aggregate([
    { $match: { tenantId: new ObjectId(req.user._id) } },
    { $lookup: { from: "properties", localField: "propertyId", foreignField: "_id", as: "property" } }, { $unwind: "$property" },
    { $lookup: { from: "users", localField: "property.ownerId", foreignField: "_id", as: "owner" } }, { $unwind: "$owner" },
    { $addFields: { "property.owner": { _id: "$owner._id", name: "$owner.name", email: "$owner.email", photoURL: "$owner.photoURL" } } },
    { $replaceRoot: { newRoot: "$property" } }, { $sort: { createdAt: -1 } },
  ]).toArray();
  return res.json({ success: true, data: favorites.map(serialize) });
}

async function removeFavorite(req, res) {
  const result = await (await connectDb()).collection("favorites").deleteOne({ tenantId: new ObjectId(req.user._id), propertyId: new ObjectId(req.validated.id) });
  if (!result.deletedCount) return res.status(404).json({ success: false, message: "Favorite was not found" });
  return res.json({ success: true, message: "Favorite removed" });
}

async function addReview(req, res) {
  const { propertyId, rating, comment } = req.validated;
  const database = await connectDb();
  const property = await database.collection("properties").findOne({ _id: new ObjectId(propertyId), status: "approved" });
  if (!property) return res.status(404).json({ success: false, message: "Property was not found" });
  const booking = await database.collection("bookings").findOne({ propertyId: property._id, tenantId: new ObjectId(req.user._id), paymentStatus: "paid" });
  if (!booking) return res.status(403).json({ success: false, message: "A completed booking is required before reviewing" });
  const now = new Date();
  await database.collection("reviews").updateOne({ propertyId: property._id, userId: new ObjectId(req.user._id) }, { $set: { rating, comment, updatedAt: now }, $setOnInsert: { propertyId: property._id, userId: new ObjectId(req.user._id), createdAt: now } }, { upsert: true });
  return res.status(201).json({ success: true, message: "Review saved" });
}

async function getReviews(req, res) {
  const reviews = await (await connectDb()).collection("reviews").aggregate([
    { $match: { propertyId: new ObjectId(req.params.id) } },
    { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } }, { $unwind: "$user" },
    { $project: { userId: 0, "user.passwordHash": 0 } }, { $sort: { createdAt: -1 } },
  ]).toArray();
  return res.json({ success: true, data: reviews.map(serialize) });
}

module.exports = { addFavorite, getFavorites, removeFavorite, addReview, getReviews };
