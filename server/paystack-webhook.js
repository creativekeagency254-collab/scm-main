// Paystack webhook handler (Node/Express) with idempotency + wallet ledger update
// Env: PAYSTACK_SECRET_KEY, DATABASE_URL

const crypto = require("crypto");
const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false }
});

// Capture raw body for signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);

function verifyPaystackSignature(req) {
  const signature = req.headers["x-paystack-signature"];
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody)
    .digest("hex");
  return hash === signature;
}

app.post("/api/v1/webhook/paystack", async (req, res) => {
  if (!verifyPaystackSignature(req)) {
    return res.status(401).json({ ok: false });
  }

  const event = req.body?.event;
  const data = req.body?.data || {};

  if (event !== "charge.success") {
    return res.status(200).json({ ok: true });
  }

  // Paystack amount is in minor units (divide by 100)
  const providerReference = data.reference;
  const amount = Number(data.amount || 0) / 100;
  const userId = data.metadata?.user_id;
  const tierAtDeposit = Number(data.metadata?.tier || 1);

  if (!providerReference || !userId || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ ok: false, error: "invalid payload" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Idempotency: lock on provider_reference
    const dep = await client.query(
      "SELECT deposit_id, status FROM deposits WHERE provider_reference = $1 FOR UPDATE",
      [providerReference]
    );

    if (dep.rowCount > 0 && dep.rows[0].status === "success") {
      await client.query("COMMIT");
      return res.status(200).json({ ok: true });
    }

    if (dep.rowCount === 0) {
      await client.query(
        "INSERT INTO deposits (user_id, amount, tier_at_deposit, status, provider, provider_reference, created_at, confirmed_at) VALUES ($1,$2,$3,'success','Paystack',$4,now(),now())",
        [userId, amount, tierAtDeposit, providerReference]
      );
    } else {
      await client.query(
        "UPDATE deposits SET status = 'success', confirmed_at = now() WHERE provider_reference = $1",
        [providerReference]
      );
    }

    // Credit wallet ledger (idempotent by reference)
    await client.query(
      "SELECT apply_wallet_tx($1, 'deposit', $2, NULL, $3)",
      [userId, amount, `dep:${providerReference}`]
    );

    // Referral commission (10% direct referrer)
    const ref = await client.query(
      "SELECT referrer_id FROM users WHERE user_id = $1",
      [userId]
    );

    const referrerId = ref.rows[0]?.referrer_id;
    if (referrerId) {
      const commission = Number((amount * 0.10).toFixed(2));
      await client.query(
        "INSERT INTO referrals (referrer_id, referred_user_id, deposit_id, commission_amount, created_at) VALUES ($1,$2,(SELECT deposit_id FROM deposits WHERE provider_reference=$3),$4,now())",
        [referrerId, userId, providerReference, commission]
      );

      await client.query(
        "SELECT apply_wallet_tx($1, 'referral', $2, NULL, $3)",
        [referrerId, commission, `ref:${providerReference}`]
      );
    }

    await client.query("COMMIT");
    return res.status(200).json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ ok: false });
  } finally {
    client.release();
  }
});

module.exports = app;
