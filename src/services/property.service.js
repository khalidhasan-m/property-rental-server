const { ObjectId } = require("mongodb");
const { connectDb } = require("../config/db");

function serialize(value) {
  if (value instanceof ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  return value;
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function propertyMatch(query, status = "approved") {
  const match = (status && status !== "all") ? { status } : {};
  if (query.location) match.location = { $regex: escapeRegex(query.location), $options: "i" };
  if (query.search) {
    const safeSearch = escapeRegex(query.search);
    match.$or = [{ title: { $regex: safeSearch, $options: "i" } }, { location: { $regex: safeSearch, $options: "i" } }, { propertyType: { $regex: safeSearch, $options: "i" } }];
  }
  if (query.propertyType) match.propertyType = { $regex: `^${escapeRegex(query.propertyType)}$`, $options: "i" };
  if (query.minPrice !== undefined || query.maxPrice !== undefined) match.rent = { ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}), ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}) };
  return match;
}

async function listProperties(query, options = {}) {
  const database = await connectDb();
  const page = query.page || 1;
  const limit = query.limit || 9;
  const status = options.status === undefined ? "approved" : options.status;
  const sort = query.sort === "price_asc" ? { rent: 1 } : query.sort === "price_desc" ? { rent: -1 } : { createdAt: -1 };
  const pipeline = [
    { $match: propertyMatch(query, status) },
    { $lookup: { from: "users", localField: "ownerId", foreignField: "_id", as: "owner" } },
    { $unwind: "$owner" },
    { $lookup: { from: "reviews", localField: "_id", foreignField: "propertyId", as: "reviewSummary" } },
    { $addFields: { averageRating: { $round: [{ $avg: "$reviewSummary.rating" }, 1] }, reviewCount: { $size: "$reviewSummary" } } },
    { $project: { reviewSummary: 0, "owner.passwordHash": 0, "owner.provider": 0 } },
    { $sort: sort },
    { $facet: { metadata: [{ $count: "total" }], data: [{ $skip: (page - 1) * limit }, { $limit: limit }] } },
  ];
  const [result] = await database.collection("properties").aggregate(pipeline).toArray();
  const total = result.metadata[0]?.total || 0;
  return { data: result.data.map(serialize), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
}

async function getPropertyById(id) {
  const database = await connectDb();
  const [property] = await database.collection("properties").aggregate([
    { $match: { _id: new ObjectId(id) } },
    { $lookup: { from: "users", localField: "ownerId", foreignField: "_id", as: "owner" } },
    { $unwind: "$owner" },
    { $lookup: { from: "reviews", localField: "_id", foreignField: "propertyId", as: "reviews" } },
    { $addFields: { averageRating: { $round: [{ $avg: "$reviews.rating" }, 1] }, reviewCount: { $size: "$reviews" } } },
    { $project: { "owner.passwordHash": 0, "owner.provider": 0 } },
  ]).toArray();
  return property ? serialize(property) : null;
}

module.exports = { listProperties, getPropertyById, serialize };
