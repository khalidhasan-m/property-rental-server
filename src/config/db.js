const { MongoClient } = require("mongodb");
const { env } = require("./env");

let client;
let database;

async function connectDb() {
  if (database) return database;
  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  database = client.db(env.MONGODB_DB);
  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("properties").createIndex({ ownerId: 1, status: 1, createdAt: -1 }),
    database.collection("properties").createIndex({ location: 1, propertyType: 1, rent: 1 }),
    database.collection("bookings").createIndex({ tenantId: 1, createdAt: -1 }),
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
