const { ObjectId } = require("mongodb");
const { connectDb } = require("../config/db");

async function ownerAnalytics(ownerId) {
  const database = await connectDb();
  const ownerObjectId = new ObjectId(ownerId);

  // Get approved & paid booking IDs for this owner
  const approvedBookings = await database.collection("bookings").find({
    ownerId: ownerObjectId,
    bookingStatus: "approved",
    paymentStatus: "paid"
  }, { projection: { _id: 1 } }).toArray();

  const approvedBookingIds = approvedBookings.map(b => b._id);

  const [propertyCount, bookingCount, earningsRows] = await Promise.all([
    database.collection("properties").countDocuments({ ownerId: ownerObjectId }),
    database.collection("bookings").countDocuments({ ownerId: ownerObjectId, bookingStatus: "approved", paymentStatus: "paid" }),
    database.collection("transactions").aggregate([
      { $match: { ownerId: ownerObjectId, bookingId: { $in: approvedBookingIds }, status: "succeeded" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]).toArray(),
  ]);

  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 11, 1);
  since.setUTCHours(0, 0, 0, 0);

  const rows = await database.collection("transactions").aggregate([
    { $match: { ownerId: ownerObjectId, bookingId: { $in: approvedBookingIds }, status: "succeeded", createdAt: { $gte: since } } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, earnings: { $sum: "$amount" } } },
  ]).toArray();

  const lookup = new Map(rows.map((row) => [`${row._id.year}-${row._id.month}`, row.earnings]));

  const monthlyEarnings = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + index, 1));
    return { month: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }), earnings: lookup.get(`${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`) || 0 };
  });

  return { totalEarnings: earningsRows[0]?.total || 0, totalProperties: propertyCount, totalBookings: bookingCount, monthlyEarnings };
}

module.exports = { ownerAnalytics };
