// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
// This connects to Stripe using the key we will add in the next step
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// --- MESHY AI PROXY ---
// Add MESHY_API_KEY to your Render Environment Variables!

const MESHY_API_KEY = process.env.MESHY_API_KEY; 

// 1. Create Task
app.post('/api/meshy/create', async (req, res) => {
  try {
    const response = await fetch("https://api.meshy.ai/openapi/v1/image-to-3d", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MESHY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Meshy API Error");
    res.json(data);
  } catch (error) {
    console.error("Meshy Create Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Check Status (Polling)
app.get('/api/meshy/status/:id', async (req, res) => {
  try {
    const response = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${req.params.id}`, {
      headers: { "Authorization": `Bearer ${MESHY_API_KEY}` }
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});