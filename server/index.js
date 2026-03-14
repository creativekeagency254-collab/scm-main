const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { Pool } = require("pg");
require("dotenv").config();

const webhookApp = require("./paystack-webhook");

const app = express();
const port = process.env.PORT || 8787;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false }
});

const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
const paystackBase = process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";
const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || undefined;

// Webhook route uses its own raw-body parser
app.use(webhookApp);

app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((v) => v.trim()).filter(Boolean)
      : true,
    credentials: true
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post("/api/v1/deposit/create", async (req, res) => {
  try {
    if (!paystackSecret) {
      return res.status(500).json({ error: "PAYSTACK_SECRET_KEY not set" });
    }
    const amount = Number(req.body?.amount);
    const email = String(req.body?.email || "").trim();
    const userId = String(req.body?.user_id || "").trim();
    const tier = Number(req.body?.tier || 1);
    const method = String(req.body?.method || "Paystack");
    const currency = String(req.body?.currency || "KES");

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "invalid amount" });
    }
    if (!email || !userId) {
      return res.status(400).json({ error: "email and user_id required" });
    }

    const reference = `ep_${crypto.randomUUID().replace(/-/g, "")}`;

    const initPayload = {
      email,
      amount: Math.round(amount * 100),
      currency,
      reference,
      metadata: { user_id: userId, tier, method }
    };
    if (callbackUrl) initPayload.callback_url = callbackUrl;

    const psRes = await fetch(`${paystackBase}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(initPayload)
    });
    const psJson = await psRes.json().catch(() => ({}));
    if (!psRes.ok || !psJson?.status) {
      return res.status(400).json({ error: psJson?.message || "Paystack init failed" });
    }

    // Persist pending deposit
    await pool.query(
      "INSERT INTO deposits (user_id, amount, tier_at_deposit, status, provider, provider_reference, created_at) VALUES ($1,$2,$3,'pending','Paystack',$4,now()) ON CONFLICT (provider_reference) DO NOTHING",
      [userId, amount, tier, reference]
    );

    return res.status(200).json({
      authorization_url: psJson?.data?.authorization_url,
      reference
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error" });
  }
});

function startServer(portOverride) {
  const usePort = portOverride || port;
  return app.listen(usePort, () => {
    console.log(`Server listening on ${usePort}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, pool };
