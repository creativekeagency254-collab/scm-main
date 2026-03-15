const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const webhookApp = require("./paystack-webhook");

const app = express();
const port = process.env.PORT || 8787;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false }
});

let supabaseClient = null;
const supabaseUrl = () =>
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const hasSupabase = () =>
  !!supabaseUrl() && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const mod = await import("@supabase/supabase-js");
  supabaseClient = mod.createClient(
    supabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return supabaseClient;
}

const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
const paystackBase = process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";
const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || undefined;
const paystackMock = String(process.env.PAYSTACK_MOCK || "").toLowerCase() === "1";

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
    if (!paystackSecret && !paystackMock) {
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

    let authUrl = null;
    if (!paystackMock) {
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
      authUrl = psJson?.data?.authorization_url;
    } else {
      authUrl = `https://checkout.paystack.com/mock-${reference}`;
    }

    // Persist pending deposit
    if (hasSupabase()) {
      const sb = await getSupabase();
      const { error } = await sb
        .from("deposits")
        .upsert(
          {
            user_id: userId,
            amount,
            tier_at_deposit: tier,
            status: "pending",
            provider: "Paystack",
            provider_reference: reference,
            created_at: new Date().toISOString()
          },
          { onConflict: "provider_reference" }
        );
      if (error) throw error;
    } else {
      await pool.query(
        "INSERT INTO deposits (user_id, amount, tier_at_deposit, status, provider, provider_reference, created_at) VALUES ($1,$2,$3,'pending','Paystack',$4,now()) ON CONFLICT (provider_reference) DO NOTHING",
        [userId, amount, tier, reference]
      );
    }

    return res.status(200).json({
      authorization_url: authUrl,
      reference
    });
  } catch (err) {
    console.error(err);
    const detail =
      process.env.NODE_ENV === "production"
        ? undefined
        : String(err?.message || err);
    return res.status(500).json({ error: "server error", detail });
  }
});

app.get("/api/v1/deposit/status", async (req, res) => {
  try {
    const reference = String(req.query?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "reference required" });
    if (hasSupabase()) {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from("deposits")
        .select("status, amount, user_id, tier_at_deposit, confirmed_at")
        .eq("provider_reference", reference)
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: "not found" });
      return res.status(200).json(data);
    }
    const result = await pool.query(
      "SELECT status, amount, user_id, tier_at_deposit, confirmed_at FROM deposits WHERE provider_reference = $1 LIMIT 1",
      [reference]
    );
    if (!result?.rows?.length) return res.status(404).json({ error: "not found" });
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    const detail =
      process.env.NODE_ENV === "production"
        ? undefined
        : String(err?.message || err);
    return res.status(500).json({ error: "server error", detail });
  }
});

function startServer(portOverride) {
  const usePort =
    portOverride === undefined || portOverride === null ? port : portOverride;
  return app.listen(usePort, () => {
    console.log(`Server listening on ${usePort}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, pool };
