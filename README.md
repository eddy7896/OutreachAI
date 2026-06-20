# Outreach AI CRM

An intelligent, automated B2B sales development platform built with Next.js and Firebase. Outreach AI acts as an autonomous SDR—it generates highly personalized cold outreach campaigns, automatically manages multi-step email sequences, processes inbound replies via webhooks, and classifies lead intent using AI.

## 🚀 Features

- **Lead Enrichment:** Automatically find employee data by searching a company name, or auto-fill prospect details using Hunter and Apollo APIs.
- **AI-Powered Email Drafting:** Generates highly personalized cold emails based on prospect industry, job title, and your product's value proposition.
- **Resilient AI Engine (Waterfall Fallback):** Uses Google Gemini 2.0 Flash as the primary AI. If rate limits are hit, it seamlessly falls back through a sequence of free open-source models (Mistral, Llama 3, Gemma) via OpenRouter.
- **Automated Sequence Engine:** A powerful cron-based workflow system that automatically progresses leads through complex email sequences (e.g., sending follow-ups after 3 days if no reply).
- **A/B Testing:** Automatically split-tests different email templates in sequences to identify the highest converting messaging.
- **Inbound Reply Classification:** Catches prospect replies via Resend Webhooks and uses AI to instantly classify their intent (Positive, More Info, Not Interested, Bounce, OOO) and update the CRM state.
- **LinkedIn Chrome Extension:** A custom browser extension that allows you to scrape prospects directly from LinkedIn and inject them into the CRM.

## 🛠️ Technology Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Database:** Firebase Firestore
- **Styling:** Material UI (MUI) & Emotion
- **Email Delivery & Inbound:** [Resend](https://resend.com/)
- **Primary AI:** Google Gemini 2.0 Flash
- **Fallback AI:** OpenRouter (Mistral, Llama 3)
- **Data Enrichment:** Hunter.io & Apollo.io

---

## 💻 Local Setup & Installation

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd emailoutreach
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory. You will need to populate the following keys:

```env
# Firebase Configuration (Client & Admin)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Email Provider
RESEND_API_KEY="re_..."

# AI Providers
GEMINI_API_KEY="AIza..."

# Fallback AI (OpenRouter)
FALLBACK_API_URL="https://openrouter.ai/api/v1"
FALLBACK_API_KEY="sk-or-v1-..."
FALLBACK_MODEL="openrouter/free" # Optional

# Lead Enrichment APIs
APOLLO_API_KEY="..."
HUNTER_API_KEY="..."

# Chrome Extension Security
EXTENSION_API_KEY="ext_sk_..." # Generate a secure random string for this

# Automated Sequences
CRON_SECRET="..." # Required for securing the Vercel sequence cron job
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## ⚙️ Architecture & Configuration Guide

### 1. Setting up the Chrome Extension
The repository includes a custom Chrome/Edge extension in the `/extension` directory for scraping LinkedIn.
1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer Mode** (top right).
3. Click **Load Unpacked** and select the `/extension` folder from this project.
4. Click the extension icon in your browser, set the backend URL (e.g., `http://localhost:3000` or your live URL), and paste your `EXTENSION_API_KEY`.

### 2. Configuring Inbound Email (Replies)
To allow the AI to read and classify prospect replies, you must configure a webhook.
1. Add a dedicated subdomain (e.g., `outreach.yourdomain.com`) to your Resend dashboard.
2. Add the Resend Inbound MX record (`inbound.resend.com`) to your DNS provider for that subdomain.
3. In Resend, create a new Webhook pointing to `https://your-production-url.com/api/webhook/inbound`.
4. Select the `email.received` event.

### 3. Setting up the Sequence Cron Job
The automated sequence engine relies on a cron job to check for delayed steps and send follow-ups.
- **If deploying on Vercel:** Next.js uses the `vercel.json` file to trigger the cron job hourly. Ensure you have added the `CRON_SECRET` environment variable to your Vercel project settings to secure the route.
- **To trigger manually for testing:** Navigate to `/api/cron/sequences` in your browser or hit it via cURL (you will need to bypass or supply the `CRON_SECRET` header if configured).

### 4. Bulk Company Enrichment
Navigate to the Leads dashboard and click **Bulk Company Search**. Type in a domain (e.g., `stripe.com`) and the system will ping the Hunter API to import up to 10 employees from that company directly into your CRM.

---

## 🔒 Security Notes
- Ensure your `EXTENSION_API_KEY` is a strong, random string to prevent unauthorized database inserts.
- The Vercel cron endpoint is protected by the standard `Authorization: Bearer <CRON_SECRET>` header pattern. Ensure this secret is set in your production environment.
- Never expose your API keys to the client side. Only `NEXT_PUBLIC_` prefixed variables are safe for the browser. All AI and Email operations in this app securely happen on the Next.js server (`/api/*` routes).
