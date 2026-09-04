# MumMate AI v4 — launch-ready starter

This version converts the prototype into a deployable web application with a **real AI endpoint** and **real Stripe subscription checkout integration** once you supply your own account credentials.

## Included

- Real server-side OpenAI Responses API integration
- Default model configurable with `OPENAI_MODEL`
- Health-query web search restricted to `nhs.uk` and `nice.org.uk`
- Deterministic emergency/urgent screening before AI is called
- Paediatric medicine-dose blocking
- Server-side API keys only
- Rate limiting
- Security headers with Helmet
- Real Stripe subscription Checkout Session endpoint
- Service status screen
- Installable PWA/service worker
- Existing child profiles, sleep/feed/nappy tracker, reminders and chat history
- Dockerfile
- Render deployment blueprint
- `.env.example`
- Basic privacy endpoint

## Make the AI live

1. Create an OpenAI API account and API key.
2. Copy `.env.example` to `.env`.
3. Put the key only in:
   `OPENAI_API_KEY=...`
4. Run:
   `npm install`
   `npm start`
5. Open `http://localhost:3000`.

Never put your OpenAI key in `public/app.js`.

## Make subscriptions live

1. Create a Stripe account.
2. Create the MumMate Plus product and a recurring monthly Price.
3. Add the secret key and Price ID to your server environment:
   `STRIPE_SECRET_KEY=...`
   `STRIPE_PRICE_ID=...`
4. Set `APP_BASE_URL` to your real HTTPS website.
5. Configure and verify Stripe webhooks before using Plus status for real access control.

The included Checkout endpoint creates a real subscription-mode Stripe Checkout Session when configured.

## Deploy

### Render
- Push this folder to a private GitHub repository.
- Create a new Blueprint/Web Service from `render.yaml`.
- Add your secret environment variables in Render.
- Set `APP_BASE_URL` to the deployed HTTPS URL.

### Docker
`docker build -t mummate-ai .`
`docker run --env-file .env -p 3000:3000 mummate-ai`

## What is NOT automatically completed

This starter is much closer to a real product, but public release of a child-health product still needs work that cannot safely be faked in code:

- Clinical governance / clinician review of health flows
- A proper UK GDPR privacy policy and DPIA
- Database-backed accounts if you want cross-device syncing
- Account deletion/export
- Verified Stripe webhooks and entitlement storage
- Push notification infrastructure
- Apple App Store / Google Play developer accounts and review
- Native iOS/Android packaging if you want store apps instead of an installable PWA
- Production logging, monitoring, backups and incident response
- Legal/consumer terms

## Medical safety architecture

Question
→ deterministic emergency/medication screen
→ health classification
→ NHS/NICE-only web search (for health questions)
→ AI response
→ user-facing escalation guidance

This is still informational software, not a medical diagnosis service.
