const { ObjectId } = require("mongodb");
const { connectDb } = require("../config/db");
const { getPropertyById, listProperties, serialize } = require("../services/property.service");

async function getProperties(req, res) {
  const result = await listProperties(req.validated);
  return res.json({ success: true, ...result });
}

async function getFeaturedProperties(_req, res) {
  const result = await listProperties({ page: 1, limit: 6, sort: "newest" });
  return res.json({ success: true, data: result.data });
}

async function getTopLocations(_req, res) {
  const database = await connectDb();
  const locations = await database.collection("properties").aggregate([
    { $match: { status: "approved" } },
    { $addFields: {
        city: { $trim: { input: { $last: { $split: ["$location", ","] } } } }
    }},
    { $group: {
        _id: "$city",
        propertiesCount: { $sum: 1 },
        image: { $first: { $arrayElemAt: ["$images", 0] } }
    }},
    { $sort: { propertiesCount: -1 } },
    { $limit: 4 },
    { $project: { name: "$_id", properties: "$propertiesCount", image: 1, _id: 0 } }
  ]).toArray();
  return res.json({ success: true, data: locations });
}

async function getProperty(req, res) {
  const property = await getPropertyById(req.validated.id);
  if (!property || property.status !== "approved") return res.status(404).json({ success: false, message: "Property was not found" });
  return res.json({ success: true, data: property });
}

async function createProperty(req, res) {
  const database = await connectDb();
  const now = new Date();
  const property = { ...req.validated, status: "pending", ownerId: new ObjectId(req.user._id), createdAt: now, updatedAt: now };
  const result = await database.collection("properties").insertOne(property);
  return res.status(201).json({ success: true, message: "Property submitted for approval", data: serialize({ ...property, _id: result.insertedId }) });
}

async function getMyProperties(req, res) {
  const database = await connectDb();
  const { page = 1, limit = 10, status } = req.validated;
  const match = { ownerId: new ObjectId(req.user._id), ...(status ? { status } : {}) };
  const [result] = await database.collection("properties").aggregate([{ $match: match }, { $sort: { createdAt: -1 } }, { $facet: { metadata: [{ $count: "total" }], data: [{ $skip: (page - 1) * limit }, { $limit: limit }] } }]).toArray();
  const total = result.metadata[0]?.total || 0;
  return res.json({ success: true, data: result.data.map(serialize), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
}

async function updateProperty(req, res) {
  const database = await connectDb();
  const id = new ObjectId(req.params.id);
  const property = await database.collection("properties").findOne({ _id: id });
  if (!property) return res.status(404).json({ success: false, message: "Property was not found" });
  if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== "admin") return res.status(403).json({ success: false, message: "You cannot update this property" });
  const update = { ...req.validated, updatedAt: new Date(), ...(req.user.role === "owner" ? { status: "pending", rejectionFeedback: undefined } : {}) };
  await database.collection("properties").updateOne({ _id: id }, { $set: update });
  const updated = await database.collection("properties").findOne({ _id: id });
  return res.json({ success: true, message: "Property updated", data: serialize(updated) });
}

async function deleteProperty(req, res) {
  const database = await connectDb();
  const id = new ObjectId(req.validated.id);
  const property = await database.collection("properties").findOne({ _id: id });
  if (!property) return res.status(404).json({ success: false, message: "Property was not found" });
  if (property.ownerId.toString() !== req.user._id.toString() && req.user.role !== "admin") return res.status(403).json({ success: false, message: "You cannot delete this property" });
  await database.collection("properties").deleteOne({ _id: id });
  await database.collection("favorites").deleteMany({ propertyId: id });
  return res.json({ success: true, message: "Property deleted" });
}

async function adminProperties(req, res) {
  const status = req.validated.status || "all";
  const result = await listProperties(req.validated, { status });
  return res.json({ success: true, ...result });
}

async function moderateProperty(req, res) {
  const database = await connectDb();
  const id = new ObjectId(req.params.id);
  const property = await database.collection("properties").findOne({ _id: id });
  if (!property) return res.status(404).json({ success: false, message: "Property was not found" });
  const { status, rejectionFeedback } = req.validated;
  await database.collection("properties").updateOne({ _id: id }, { $set: { status, rejectionFeedback: status === "rejected" ? rejectionFeedback : undefined, updatedAt: new Date() } });
  return res.json({ success: true, message: `Property ${status}`, data: { id: id.toString(), status, rejectionFeedback: status === "rejected" ? rejectionFeedback : undefined } });
}

async function getOwnProperty(req, res) {
  const database = await connectDb();
  const property = await database.collection("properties").findOne({ _id: new ObjectId(req.validated.id), ownerId: new ObjectId(req.user._id) });
  if (!property) return res.status(404).json({ success: false, message: "Property was not found" });
  return res.json({ success: true, data: serialize(property) });
}

module.exports = { getProperties, getFeaturedProperties, getTopLocations, getProperty, createProperty, getMyProperties, getOwnProperty, updateProperty, deleteProperty, adminProperties, moderateProperty };
