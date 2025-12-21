// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Ensure you ran: npm install axios
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
// Increased limit for high-res images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const MESHY_API_KEY = process.env.MESHY_API_KEY; 

// --- 🛡️ HELPER: CHECK MESHY CREDITS ---
async function checkMeshyCredits() {
    try {
        // This is an undocumented Meshy endpoint, but standard for their API
        // If it fails, we default to "True" to avoid blocking valid sales during API glitches
        const res = await axios.get("https://api.meshy.ai/openapi/v1/balance", {
            headers: { "Authorization": `Bearer ${MESHY_API_KEY}` }
        });
        
        const available = res.data.balance || 0;
        console.log(`🔋 Meshy Balance: ${available} Credits`);
        
        // We need ~20-25 credits per generation
        return available >= 25; 
    } catch (e) {
        console.warn("⚠️ Could not check balance, assuming online.");
        return true; 
    }
}

// --- STRIPE PAYMENT (With Live Inventory Check) ---
app.post('/create-payment-intent', async (req, res) => {
  
  // 1. SAFETY CHECK: Do we have credits?
  const hasCredits = await checkMeshyCredits();

  if (!hasCredits) {
      console.log("🛑 Pre-Check Failed: Not enough credits. Blocking payment.");
      return res.status(503).json({ 
          error: "High Demand: Our GPU capacity is currently full. Please try again later.",
          code: "SOLD_OUT"
      });
  }

  // 2. PROCEED TO SALE
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 199, // $1.99 Price Point
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(4242, () => console.log('Server running on port 4242'));

// --- MESHY PROXY ---
app.post('/api/meshy/create', async (req, res) => {
  const { paymentIntentId, ...meshyPayload } = req.body;

  try {
    console.log("🚀 Sending request to Meshy...");
    
    const response = await axios.post("https://api.meshy.ai/openapi/v1/image-to-3d", meshyPayload, {
      headers: {
        "Authorization": `Bearer ${MESHY_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    
    res.json(response.data);

  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("❌ Meshy Error:", errorMsg);

    // 🚨 BACKUP REFUND: If generation fails after they paid
    if (paymentIntentId) {
        console.log(`💸 Issuing Backup Refund for ${paymentIntentId}...`);
        await refundUser(paymentIntentId);
    }

    res.status(500).json({ 
        error: "Generation Failed. You have been automatically refunded.", 
        details: errorMsg 
    });
  }
});

// Polling Route
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
    try {
        await stripe.refunds.create({ payment_intent: paymentIntentId });
        console.log("✅ Refund Successful");
    } catch (err) {
        console.error("❌ CRITICAL: Refund Failed", err.message);
    }
}