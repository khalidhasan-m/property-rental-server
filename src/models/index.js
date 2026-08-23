const { connectDb } = require("../config/db");

async function models() {
  const database = await connectDb();
  return {
    users: database.collection("users"),
    properties: database.collection("properties"),
    bookings: database.collection("bookings"),
    favorites: database.collection("favorites"),
    reviews: database.collection("reviews"),
    transactions: database.collection("transactions"),
  };
}

module.exports = { models };
