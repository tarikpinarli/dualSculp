// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
// This connects to Stripe using the key we will add in the next step
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

app.post('/create-payment-intent', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 99, // $0.99
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(4242, () => console.log('Server running on port 4242'));