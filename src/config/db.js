const { MongoClient } = require("mongodb");
const { env } = require("./env");

let client;
let database;

async function cleanupDuplicateBookings() {
  // Find groups of bookings with the same propertyId and moveInDate that are pending or approved
  const duplicates = await database
    .collection("bookings")
    .aggregate([
      { $match: { bookingStatus: { $in: ["pending", "approved"] } } },
      {
        $group: {
          _id: { propertyId: "$propertyId", moveInDate: "$moveInDate" },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  for (const group of duplicates) {
    // Keep the first booking, delete the rest
    const [, ...redundantIds] = group.ids;
    if (redundantIds.length) {
      await database
        .collection("bookings")
        .deleteMany({ _id: { $in: redundantIds } });
    }
  }
}

async function connectDb() {
  if (database) return database;
  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  database = client.db(env.MONGODB_DB);

  // Clean up any existing duplicate active bookings before creating the unique index
  await cleanupDuplicateBookings();

  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("properties").createIndex({ ownerId: 1, status: 1, createdAt: -1 }),
    database.collection("properties").createIndex({ location: 1, propertyType: 1, rent: 1 }),
    // Unique index on active bookings (pending or approved)
    database.collection("bookings").createIndex(
      { propertyId: 1, moveInDate: 1 },
      { unique: true, partialFilterExpression: { bookingStatus: { $in: ["pending", "approved"] } } }
    ),
    database.collection("bookings").createIndex({ ownerId: 1, createdAt: -1 }),
    database.collection("favorites").createIndex({ tenantId: 1, propertyId: 1 }, { unique: true }),
    database.collection("reviews").createIndex({ propertyId: 1, createdAt: -1 }),
    database.collection("transactions").createIndex({ bookingId: 1 }, { unique: true }),
  ]);

  return database;
}

async function closeDb() {
  await (client && client.close());
  client = undefined;
  database = undefined;
}

module.exports = { connectDb, closeDb };
