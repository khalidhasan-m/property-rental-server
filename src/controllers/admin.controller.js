const { ObjectId } = require("mongodb");
const { connectDb } = require("../config/db");
const { serialize } = require("../services/property.service");
const { ownerAnalytics } = require("../services/analytics.service");

async function getUsers(req, res) {
  const database = await connectDb();
  const { page = 1, limit = 10, search } = req.validated;
  const match = search ? { $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }] } : {};
  const [result] = await database.collection("users").aggregate([{ $match: match }, { $sort: { createdAt: -1 } }, { $project: { passwordHash: 0 } }, { $facet: { metadata: [{ $count: "total" }], data: [{ $skip: (page - 1) * limit }, { $limit: limit }] } }]).toArray();
  const total = result.metadata[0]?.total || 0;
  return res.json({ success: true, data: result.data.map(serialize), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
}

async function changeRole(req, res) {
  const database = await connectDb();
  const userId = new ObjectId(req.params.id);
  if (userId.toString() === req.user._id.toString()) return res.status(400).json({ success: false, message: "You cannot change your own role" });
  const result = await database.collection("users").updateOne({ _id: userId }, { $set: { role: req.validated.role, updatedAt: new Date() } });
  if (!result.matchedCount) return res.status(404).json({ success: false, message: "User was not found" });
  return res.json({ success: true, message: "User role updated" });
}

async function getTransactions(req, res) {
  const database = await connectDb();
  const { page = 1, limit = 10 } = req.validated;
  const [result] = await database.collection("transactions").aggregate([
    { $lookup: { from: "properties", localField: "propertyId", foreignField: "_id", as: "property" } }, { $unwind: "$property" },
    { $lookup: { from: "users", localField: "tenantId", foreignField: "_id", as: "tenant" } }, { $unwind: "$tenant" },
    { $lookup: { from: "users", localField: "ownerId", foreignField: "_id", as: "owner" } }, { $unwind: "$owner" },
    { $sort: { createdAt: -1 } }, { $project: { "tenant.passwordHash": 0, "owner.passwordHash": 0 } },
    { $facet: { metadata: [{ $count: "total" }], data: [{ $skip: (page - 1) * limit }, { $limit: limit }] } },
  ]).toArray();
  const total = result.metadata[0]?.total || 0;
  return res.json({ success: true, data: result.data.map(serialize), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
}

async function getOwnerAnalytics(req, res) {
  return res.json({ success: true, data: await ownerAnalytics(req.user._id.toString()) });
}

module.exports = { getUsers, changeRole, getTransactions, getOwnerAnalytics };
