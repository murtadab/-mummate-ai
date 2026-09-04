
import "dotenv/config";
import express from "express";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import Stripe from "stripe";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      formAction: ["'self'", "https://checkout.stripe.com"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(express.json({ limit: "100kb" }));
app.use(rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false
}));
app.use(express.static(__dirname));

const EMERGENCY = [
  "not breathing","stopped breathing","struggling to breathe","can't breathe","cannot breathe",
  "blue lips","blue face","blue or grey","unresponsive","won't wake","not waking",
  "seizure","fit","choking","severe bleeding"
];

const URGENT = [
  "non blanching rash","non-blanching rash","rash that doesn't fade",
  "very sleepy","hard to wake","difficult to wake","no wet nappy","dehydrated"
];

const MEDICATION = [
  "dose","dosage","how much calpol","how much nurofen","paracetamol dose","ibuprofen dose",
  "medicine dose","medication dose"
];

function textHasAny(text, terms) {
  const q = String(text || "").toLowerCase();
  return terms.some(term => q.includes(term));
}

function deterministicSafety(question, child) {
  if (textHasAny(question, EMERGENCY)) {
    return {
      blocked: true,
      level: "emergency",
      answer:
        "This could be a medical emergency. Call 999 now if your child is struggling to breathe, is blue or grey, unresponsive, having a seizure, choking, has severe bleeding, or you believe they are seriously unwell. Do not rely on MumMate for emergency care."
    };
  }

  if (textHasAny(question, URGENT)) {
    return {
      blocked: true,
      level: "urgent",
      answer:
        "Because of what you described, please seek urgent medical advice rather than relying on the app. In the UK, contact NHS 111 or an urgent medical service. Call 999 if your child becomes seriously unwell."
    };
  }

  if (textHasAny(question, MEDICATION)) {
    return {
      blocked: true,
      level: "medication",
      answer:
        "MumMate does not calculate medicine doses. Children's dosing depends on the exact medicine and formulation, age and sometimes weight. Check the product label and ask a pharmacist, NHS 111 or a clinician if you are unsure."
    };
  }

  return { blocked: false, level: "normal" };
}

function looksHealthRelated(question) {
  return textHasAny(question, [
    "fever","temperature","rash","cough","vomit","vomiting","diarrhoea","diarrhea",
    "pain","sick","ill","medicine","calpol","nurofen","paracetamol","ibuprofen",
    "breathing","infection","doctor","gp","hospital","symptom","allergy","teething"
  ]);
}

function childContext(child) {
  if (!child) return "No child profile was selected.";
  const notes = child.notes ? ` Notes: ${String(child.notes).slice(0, 250)}.` : "";
  return `Child profile: ${child.name || "child"}, age ${child.age || "unknown"} ${child.unit || ""}.${notes}`;
}

function systemPrompt(health) {
  return `You are MumMate AI, a UK-focused parenting information assistant.
Your audience is parents and carers of children.

Rules:
- Give concise, calm, practical information in plain British English.
- Never claim to diagnose a child.
- Never replace emergency services, NHS 111, a GP, pharmacist or health visitor.
- Never calculate or invent a paediatric medicine dose.
- If details are missing, explain what materially changes the advice rather than guessing.
- For medical or symptom questions, ground factual claims in the trusted UK sources made available to you.
- For emergencies, advise 999. For urgent but non-life-threatening concerns, mention NHS 111 where appropriate.
- Avoid false reassurance.
- Do not ask for unnecessary sensitive personal information.
${health ? "- This is a health-related question. Use trusted-source web search when available and keep the answer source-grounded." : ""}
`;
}

function fallbackAnswer(question, child) {
  const age = child ? `${child.age} ${child.unit}` : "the age you describe";
  const q = String(question).toLowerCase();
  if (q.includes("sleep") || q.includes("waking")) {
    return `At ${age}, sleep can vary. A predictable bedtime routine, calm settling and low-key night interactions can help. If the change is sudden, consider illness, teething, hunger or a change in routine.`;
  }
  if (q.includes("food") || q.includes("weaning") || q.includes("eat")) {
    return `Food guidance depends strongly on age. For ${age}, use age-appropriate textures and avoid choking hazards. Tell me the exact food and I can explain the main safety considerations.`;
  }
  return `I can help with that for ${age}. Live AI is not configured on this server yet. Add OPENAI_API_KEY to the server environment to enable the real AI assistant.`;
}

app.get("/api/status", (req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(openai),
    paymentsConfigured: Boolean(stripe && process.env.STRIPE_PRICE_ID),
    trustedWebSearch: process.env.ENABLE_TRUSTED_WEB_SEARCH !== "false",
    model: MODEL
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { question, child } = req.body || {};
    if (!question || typeof question !== "string" || question.length > 3000) {
      return res.status(400).json({ error: "A question under 3000 characters is required." });
    }

    const safety = deterministicSafety(question, child);
    if (safety.blocked) {
      return res.json({ answer: safety.answer, safetyLevel: safety.level, sources: [] });
    }

    if (!openai) {
      return res.json({
        answer: fallbackAnswer(question, child),
        safetyLevel: "normal",
        sources: []
      });
    }

    const health = looksHealthRelated(question);
    const tools =
      health && process.env.ENABLE_TRUSTED_WEB_SEARCH !== "false"
        ? [{
            type: "web_search",
            filters: { allowed_domains: ["nhs.uk", "nice.org.uk"] },
            search_context_size: "medium",
            user_location: { type: "approximate", country: "GB", timezone: "Europe/London" }
          }]
        : [];

    const response = await openai.responses.create({
      model: MODEL,
      reasoning: { effort: "low" },
      instructions: systemPrompt(health),
      input: `${childContext(child)}\n\nParent question: ${question}`,
      tools,
      tool_choice: tools.length ? "auto" : "none",
      max_output_tokens: 700
    });

    const answer = response.output_text?.trim() || "I couldn't produce a useful answer.";
    return res.json({
      answer,
      safetyLevel: "normal",
      sources: health ? ["NHS / NICE trusted web search enabled"] : []
    });
  } catch (err) {
    console.error("chat_error", err?.message || err);
    res.status(500).json({
      error: "The assistant is temporarily unavailable. For urgent medical concerns, use NHS 111 or 999 for emergencies."
    });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    if (!stripe || !process.env.STRIPE_PRICE_ID) {
      return res.status(503).json({ error: "Payments are not configured yet." });
    }
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : undefined;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: email || undefined,
      success_url: `${BASE_URL}/?subscription=success`,
      cancel_url: `${BASE_URL}/?subscription=cancelled`,
      allow_promotion_codes: true
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("checkout_error", err?.message || err);
    res.status(500).json({ error: "Could not start checkout." });
  }
});

app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), (req, res) => {
  // NOTE: This route is included as a deployment hook. In production, mount this
  // before express.json() and verify STRIPE_WEBHOOK_SECRET before provisioning Plus.
  res.status(200).json({ received: true });
});

app.get("/privacy", (req, res) => {
  res.type("text/plain").send(
`MumMate AI prototype privacy notice

This deployment-ready starter is designed to minimise data collection.
The included browser app stores child profiles, tracker logs and chat history locally on the user's device.
Questions sent to /api/chat are processed by the server to generate an answer.
Before a public launch, publish a solicitor-reviewed UK GDPR privacy policy, define retention periods,
add account deletion/export, complete a DPIA where appropriate, and document every processor used.`
  );
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`MumMate AI v4 running at ${BASE_URL}`);
  console.log(`AI configured: ${Boolean(openai)}`);
  console.log(`Stripe configured: ${Boolean(stripe && process.env.STRIPE_PRICE_ID)}`);
});
