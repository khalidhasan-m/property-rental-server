const Stripe = require("stripe");
const { env } = require("../config/env");

function stripeClient() {
  if (!env.STRIPE_SECRET_KEY) {
    const error = new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to the server environment.");
    error.status = 503;
    throw error;
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

async function createReservationIntent({ bookingId, amount, propertyTitle, tenantEmail }) {
  const stripe = stripeClient();
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    receipt_email: tenantEmail,
    metadata: { bookingId, propertyTitle },
  });
}

async function retrievePaymentIntent(paymentIntentId) {
  return stripeClient().paymentIntents.retrieve(paymentIntentId);
}

module.exports = { createReservationIntent, retrievePaymentIntent };
