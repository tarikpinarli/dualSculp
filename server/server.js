// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// 1. Define Module Prices (Server-Side Source of Truth)
const MODULE_PRICES = {
  'intersection-basic': 99,   // $0.99
  'wall-art-basic': 299,      // $2.99 (Example for future module)
  'pro-suite': 1499           // $14.99
};

app.get('/', (req, res) => res.send('CrossCast API Online'));

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { moduleId } = req.body;
    
    // 2. Validate Module ID
    const amount = MODULE_PRICES[moduleId];
    if (!amount) {
      return res.status(400).json({ error: "Invalid Module ID" });
    }

    // 3. Create Intent with dynamic amount
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: { moduleId } // Track which tool they bought
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(4242, () => console.log('Server running on port 4242'));