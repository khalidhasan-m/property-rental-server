const { ObjectId } = require("mongodb");
const { connectDb } = require("../config/db");
const { createReservationIntent, retrievePaymentIntent } = require("../services/stripe.service");
const { serialize } = require("../services/property.service");

async function createBooking(req, res) {
  const { propertyId, moveInDate, contactNumber, notes } = req.validated;
  const database = await connectDb();
  const property = await database.collection("properties").findOne({ _id: new ObjectId(propertyId), status: "approved" });
  if (!property) return res.status(404).json({ success: false, message: "Approved property was not found" });
  if (property.ownerId.toString() === req.user._id.toString()) return res.status(400).json({ success: false, message: "You cannot book your own property" });

  // Check if the tenant already has a booking for this property/date
  const tenantBooking = await database.collection("bookings").findOne({
    propertyId: property._id,
    tenantId: new ObjectId(req.user._id),
    moveInDate,
    bookingStatus: { $in: ["pending", "approved"] },
  });
  if (tenantBooking) {
    return res.status(409).json({ success: false, message: "You already have an active booking for this property on this date" });
  }

  // Check if any other tenant has a booking for the same property and date
  const conflictingBooking = await database.collection("bookings").findOne({
    propertyId: property._id,
    moveInDate,
    bookingStatus: { $in: ["pending", "approved"] },
    tenantId: { $ne: new ObjectId(req.user._id) },
  });
  if (conflictingBooking) {
    return res.status(409).json({ success: false, message: "Property is already booked for this date" });
  }

  const booking = { propertyId: property._id, tenantId: new ObjectId(req.user._id), ownerId: property.ownerId, moveInDate, contactNumber, notes: notes || undefined, amount: property.rent, bookingStatus: "pending", paymentStatus: "pending", createdAt: new Date(), updatedAt: new Date() };
  const result = await database.collection("bookings").insertOne(booking);
  return res.status(201).json({ success: true, message: "Booking created. Continue to payment.", data: serialize({ ...booking, _id: result.insertedId }) });
}

async function createPaymentIntent(req, res) {
  const { bookingId } = req.validated;
  const database = await connectDb();
  const booking = await database.collection("bookings").findOne({ _id: new ObjectId(bookingId), tenantId: new ObjectId(req.user._id) });
  if (!booking) return res.status(404).json({ success: false, message: "Booking was not found" });
  if (booking.paymentStatus === "paid") return res.status(400).json({ success: false, message: "This booking has already been paid" });
  const property = await database.collection("properties").findOne({ _id: booking.propertyId });
  const intent = await createReservationIntent({ bookingId, amount: booking.amount, propertyTitle: property.title, tenantEmail: req.user.email });
  await database.collection("bookings").updateOne({ _id: booking._id }, { $set: { paymentIntentId: intent.id, updatedAt: new Date() } });
  return res.json({ success: true, data: { clientSecret: intent.client_secret, amount: booking.amount } });
}

async function confirmPayment(req, res) {
  const { bookingId, paymentIntentId } = req.validated;
  const database = await connectDb();
  const booking = await database.collection("bookings").findOne({ _id: new ObjectId(bookingId), tenantId: new ObjectId(req.user._id) });
  if (!booking) return res.status(404).json({ success: false, message: "Booking was not found" });
  const intent = await retrievePaymentIntent(paymentIntentId);
  if (intent.status !== "succeeded" || intent.metadata.bookingId !== bookingId) return res.status(400).json({ success: false, message: "Payment has not completed successfully" });
  await database.collection("bookings").updateOne({ _id: booking._id }, { $set: { paymentIntentId, paymentStatus: "paid", updatedAt: new Date() } });
  await database.collection("transactions").updateOne({ bookingId: booking._id }, { $setOnInsert: { bookingId: booking._id, propertyId: booking.propertyId, tenantId: booking.tenantId, ownerId: booking.ownerId, stripePaymentIntentId: paymentIntentId, amount: booking.amount, currency: intent.currency, status: "succeeded", createdAt: new Date() } }, { upsert: true });
  return res.json({ success: true, message: "Payment confirmed", data: { bookingId } });
}

async function myBookings(req, res) {
  const database = await connectDb();
  const bookings = await database.collection("bookings").aggregate([
    { $match: { tenantId: new ObjectId(req.user._id) } },
    { $lookup: { from: "properties", localField: "propertyId", foreignField: "_id", as: "property" } }, { $unwind: "$property" },
    { $lookup: { from: "users", localField: "ownerId", foreignField: "_id", as: "owner" } }, { $unwind: "$owner" },
    { $sort: { createdAt: -1 } }, { $project: { "owner.passwordHash": 0 } },
  ]).toArray();
  return res.json({ success: true, data: bookings.map(serialize) });
}

async function ownerBookings(req, res) {
  const database = await connectDb();
  const bookings = await database.collection("bookings").aggregate([
    { $match: { ownerId: new ObjectId(req.user._id) } },
    { $lookup: { from: "properties", localField: "propertyId", foreignField: "_id", as: "property" } }, { $unwind: "$property" },
    { $lookup: { from: "users", localField: "tenantId", foreignField: "_id", as: "tenant" } }, { $unwind: "$tenant" },
    { $sort: { createdAt: -1 } }, { $project: { "tenant.passwordHash": 0 } },
  ]).toArray();
  return res.json({ success: true, data: bookings.map(serialize) });
}

async function decideBooking(req, res) {
  const database = await connectDb();
  const booking = await database.collection("bookings").findOne({ _id: new ObjectId(req.params.id), ownerId: new ObjectId(req.user._id) });
  if (!booking) return res.status(404).json({ success: false, message: "Booking was not found" });

  const { bookingStatus } = req.validated;
  const updateFields = { bookingStatus, updatedAt: new Date() };

  if (bookingStatus === "rejected" && booking.paymentStatus === "paid") {
    updateFields.paymentStatus = "refunded";
  }

  await database.collection("bookings").updateOne({ _id: booking._id }, { $set: updateFields });

  if (bookingStatus === "rejected") {
    await database.collection("transactions").updateMany(
      { bookingId: booking._id },
      { $set: { status: "refunded", updatedAt: new Date() } }
    );
  } else if (bookingStatus === "approved" && booking.paymentStatus === "paid") {
    await database.collection("transactions").updateMany(
      { bookingId: booking._id },
      { $set: { status: "succeeded", updatedAt: new Date() } }
    );
  }

  return res.json({ success: true, message: `Booking ${bookingStatus}` });
}

async function adminBookings(req, res) {
  const database = await connectDb();
  const { page, limit } = req.validated;
  const [result] = await database.collection("bookings").aggregate([
    { $sort: { createdAt: -1 } },
    { $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $lookup: { from: "properties", localField: "propertyId", foreignField: "_id", as: "property" } }, { $unwind: "$property" },
          { $lookup: { from: "users", localField: "tenantId", foreignField: "_id", as: "tenant" } }, { $unwind: "$tenant" },
          { $lookup: { from: "users", localField: "ownerId", foreignField: "_id", as: "owner" } }, { $unwind: "$owner" },
          { $project: { "tenant.passwordHash": 0, "owner.passwordHash": 0 } }
        ]
    }}
  ]).toArray();

  const total = result.metadata[0]?.total || 0;
  return res.json({ success: true, data: result.data.map(serialize), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
}

module.exports = { createBooking, createPaymentIntent, confirmPayment, myBookings, ownerBookings, decideBooking, adminBookings };
