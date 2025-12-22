// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const MESHY_API_KEY = process.env.MESHY_API_KEY; 

// --- HELPER: CHECK CREDITS ---
async function checkMeshyCredits() {
    try {
        const res = await axios.get("https://api.meshy.ai/openapi/v1/balance", {
            headers: { "Authorization": `Bearer ${MESHY_API_KEY}` }
        });
        const available = res.data.balance || 0;
        console.log(`🔋 Meshy Balance: ${available}`);
        return available >= 25; 
    } catch (e) {
        console.warn("⚠️ Balance check failed, assuming online.");
        return true; 
    }
}

// --- 🕵️‍♂️ DEBUG ROUTE (Truth Detector) ---
app.get('/debug-stripe', (req, res) => {
    const key = process.env.STRIPE_SECRET_KEY || "No Key Found";
    // Show first 8 chars only for safety
    const mode = key.startsWith("sk_test") ? "🟢 TEST MODE" : "🔴 LIVE MODE";
    const keyHint = key.substring(0, 8) + "...";
    
    res.json({
        status: "Online",
        stripe_mode: mode,
        key_prefix: keyHint,
        meshy_key_status: MESHY_API_KEY ? "Present" : "Missing"
    });
});

// --- STRIPE PAYMENT (DYNAMIC PRICING) ---
app.post('/create-payment-intent', async (req, res) => {
  const { product } = req.body; 

  let amount = 99; // Default $0.99

  // SPECIAL PRICE FOR MESHY: $1.99
  if (product === 'meshy') {
      amount = 199; 
      const hasCredits = await checkMeshyCredits();
      if (!hasCredits) {
          console.log("🛑 Meshy Sold Out.");
          return res.status(503).json({ error: "High Demand: GPU capacity full.", code: "SOLD_OUT" });
      }
  }

  console.log(`💰 New Checkout: ${product || 'Standard'} Item - $${amount/100}`);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, 
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- MESHY PROXY ---
app.post('/api/meshy/create', async (req, res) => {
  const { paymentIntentId, ...meshyPayload } = req.body;
  try {
    const response = await axios.post("https://api.meshy.ai/openapi/v1/image-to-3d", meshyPayload, {
      headers: { "Authorization": `Bearer ${MESHY_API_KEY}`, "Content-Type": "application/json" }
    });
    res.json(response.data);
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    if (paymentIntentId) await refundUser(paymentIntentId);
    res.status(500).json({ error: "Generation Failed", details: errorMsg });
  }
});

app.get('/api/meshy/status/:id', async (req, res) => {
    try {
        const response = await axios.get(`https://api.meshy.ai/openapi/v1/image-to-3d/${req.params.id}`, {
          headers: { "Authorization": `Bearer ${MESHY_API_KEY}` }
        });
        res.json(response.data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});

async function refundUser(paymentIntentId) {
    try { await stripe.refunds.create({ payment_intent: paymentIntentId }); } 
    catch (err) { console.error("Refund Failed", err.message); }
}

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));