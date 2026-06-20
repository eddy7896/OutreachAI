# 📧 Email Outreach & Intent Classification Platform — System Context

> **Last Updated**: 2026-06-19
> **Project Type**: Internal B2B Sales Outreach Tool
> **Owner**: Internal SDR team
> **Status**: Pre-development (plan approved)

---

## 1. Project Overview

An internal tool for managing B2B cold email outreach campaigns. The platform combines:
- **AI-powered email intent classification** — Analyze incoming email replies and classify prospect intent (positive, info request, rejection, OOO, bounce)
- **AI email generation & auto-formatting** — Generate personalized outreach emails based on product context, lead industry, and company
- **Template management** — Create reusable email templates with dynamic placeholders
- **Campaign & sequence management** — Organize leads into campaigns with A/B tree follow-up sequences
- **Email sending** — Send individual and bulk emails via Resend API
- **Analytics & visualization** — Track outreach performance with charts and funnel visualizations

---

## 2. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 15 (App Router) | Full-stack React framework |
| Language | TypeScript | 5.x | Type safety |
| UI Library | Material UI (MUI) | v6 | Component library (Google design system) |
| Database | Firebase Firestore | v10+ | NoSQL cloud database |
| AI/LLM | Google Gemini API | `@google/generative-ai` | Email classification & generation |
| Email Sending | Resend | Latest | Transactional email delivery |
| Background Jobs | Firebase Cloud Functions | v2 | Scheduled sends & automated follow-ups |
| Excel Parsing | SheetJS (`xlsx`) | Latest | Client-side XLSX/CSV parsing |
| Charts | Recharts | Latest | Data visualization |
| Date Utils | date-fns | Latest | Date formatting & manipulation |
| Theme | Light mode only | — | Single theme, no dark mode toggle |
| Auth | None | — | Internal tool, no authentication |

---

## 3. Architecture

### 3.1 Application Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App (Frontend)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │Dashboard │ │  Leads   │ │Classify  │ │  Templates │  │
│  │          │ │Management│ │  Engine   │ │  & Compose │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │Campaigns │ │Sequences │ │Analytics │ │  Products  │  │
│  │          │ │A/B Tree  │ │          │ │  Registry  │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
├─────────────────────────────────────────────────────────┤
│                 Next.js API Routes (Backend)             │
│  /api/classify  /api/generate  /api/auto-format          │
│  /api/send      /api/send-bulk /api/pending-actions      │
├─────────────────────────────────────────────────────────┤
│              External Services                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │  Gemini  │ │  Resend  │ │  Firebase Firestore      │ │
│  │   API    │ │   API    │ │  + Cloud Functions       │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Cloud Functions Fallback
- **Primary**: Firebase Cloud Functions handle scheduled sends (every 15 min) and automated follow-ups (every hour)
- **Fallback**: If Cloud Functions are unavailable, the dashboard's `PendingActionsNotifier` component:
  1. On page load, queries Firestore for overdue scheduled sends & pending follow-ups
  2. Fires browser desktop notifications (via `Notification` API)
  3. Provides manual send actions directly in the dashboard UI

---

## 4. Data Model

### 4.1 Firestore Collections

| Collection | Purpose | Key Fields |
|-----------|---------|------------|
| `leads` | Contact/prospect data imported from Excel | firstName, lastName, email, phone, company, jobTitle?, industry, targetProduct, remarks, status, campaignId? |
| `campaigns` | Outreach campaign groups | name, description, targetProduct, templateId?, sequenceId?, status, stats{} |
| `templates` | Reusable email templates with placeholders | name, subject, body, targetProduct?, category, placeholders[] |
| `sequences` | A/B tree follow-up sequences | name, rootNodeId, nodes[] (tree structure) |
| `emails` | All sent & received emails | leadId, campaignId?, direction, subject, body, intent?, status, scheduledAt?, sentAt? |
| `products` | Product registry for AI context | name, description, valueProposition, targetAudience, keyFeatures[], competitorDifferentiators |

### 4.2 Lead Status Flow
```
new → contacted → replied → qualified → converted
                         ↘ lost
```

### 4.3 Email Statuses
```
draft → scheduled → sent → delivered
                        ↘ failed
```

### 4.4 Lead Import Columns (from Excel)
| Column | Maps To | Required |
|--------|---------|----------|
| Target Product | `targetProduct` | ✅ |
| Industry | `industry` | ✅ |
| First Name | `firstName` | ✅ |
| Last Name | `lastName` | ✅ |
| Company | `company` | ✅ |
| Job Title | `jobTitle` | ❌ Optional |
| Email | `email` | ✅ |
| Phone Number | `phone` | ✅ |
| Remarks | `remarks` | ❌ |

### 4.5 Template Placeholders
Available placeholders that auto-resolve against lead data:
```
{{first_name}}    → lead.firstName
{{last_name}}     → lead.lastName
{{full_name}}     → lead.firstName + " " + lead.lastName
{{email}}         → lead.email
{{company}}       → lead.company
{{job_title}}     → lead.jobTitle
{{industry}}      → lead.industry
{{product}}       → lead.targetProduct
{{phone}}         → lead.phone
```

---

## 5. AI Prompts & Behavior

### 5.1 Email Intent Classification Prompt
The system uses a strict classification prompt that outputs JSON only. Categories:
1. `POSITIVE_INTEREST` — Wants to book a call, asked for demo, clear buying intent
2. `MORE_INFO_REQUESTED` — Slightly interested, needs questions answered
3. `NOT_INTERESTED` — Said no, asked to unsubscribe, stop emailing
4. `OUT_OF_OFFICE` — Automated auto-responder
5. `BOUNCE` — Mail delivery errors, address not found
6. `UNKNOWN` — Illegible, empty, doesn't fit

**Output schema**:
```json
{
  "intent": "EXACT_CATEGORY_STRING",
  "summary": "1-sentence summary",
  "action_required": true/false
}
```

### 5.2 Email Generation
When generating emails, the AI receives:
- **Product context** from the Product Registry (name, description, value proposition, features, differentiators)
- **Lead context** (name, company, industry, job title, remarks)
- **Tone/style** preference from user
- **Template** (if using template mode) with placeholders

### 5.3 Auto-Format on Upload
When leads are bulk-imported, the system can auto-generate personalized email content per lead by:
1. Looking up the associated product from the Product Registry
2. Combining product context + lead's industry, company, and role
3. Sending to Gemini for personalized email generation
4. Adjusting tone, pitch, and formatting per lead's context

---

## 6. Key Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | No authentication | Internal-only tool, no external access |
| 2 | Light mode only | User preference, reduces complexity |
| 3 | Material UI v6 | Google design system, comprehensive component library |
| 4 | Client-side Excel parsing | No server upload needed, faster for user |
| 5 | Product Registry (not fixed list) | Free-form product creation with rich AI context fields |
| 6 | A/B tree sequences (not linear) | Supports conditional branching based on reply intent |
| 7 | Firebase Cloud Functions + fallback | Automated background jobs with manual desktop notification fallback |
| 8 | Max 20-30 emails/day | Resend free tier sufficient, no complex rate limiting |
| 9 | Firestore (not SQL) | Already in Firebase ecosystem, real-time listeners, flexible schema |
| 10 | Gemini API (not OpenAI/Claude) | User preference |
| 11 | Resend (not SendGrid/SES) | User already has verified domain on Resend |

---

## 7. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/classify` | POST | Classify email intent via Gemini |
| `/api/generate` | POST | Generate personalized email via Gemini |
| `/api/auto-format` | POST | Bulk auto-format emails for uploaded leads |
| `/api/send` | POST | Send single email via Resend |
| `/api/send-bulk` | POST | Send bulk emails to campaign leads |
| `/api/pending-actions` | GET | Check for overdue scheduled/follow-up emails |

---

## 8. Navigation Structure

```
📊 Dashboard        — /                    (home, stats, alerts)
👥 Leads            — /leads               (import, manage, filter)
📦 Products         — /products            (product registry)
📧 Classify         — /classify            (single + bulk intent)
✏️  Templates        — /templates           (create/edit templates)
🤖 Compose          — /compose             (AI generate + manual)
📢 Campaigns        — /campaigns           (campaign management)
🔁 Sequences        — /sequences           (A/B tree builder)
📈 Analytics        — /analytics           (charts, funnels, A/B)
```

---

## 9. Environment Variables

```env
# AI
GEMINI_API_KEY=

# Email
RESEND_API_KEY=

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

---

## 10. Color Palette & Theme

| Token | Color | Usage |
|-------|-------|-------|
| Primary | `#4F46E5` (Deep Indigo) | Navigation, primary buttons, links |
| Secondary | `#0EA5E9` (Vibrant Teal) | Secondary actions, accents |
| Success | `#10B981` (Emerald) | Positive intent, success states |
| Warning | `#F59E0B` (Amber) | Info requested, pending states |
| Error | `#EF4444` (Red) | Not interested, errors, bounces |
| Info | `#6366F1` (Indigo) | OOO, informational states |
| Background | `#F8FAFC` (Slate-50) | Page background |
| Surface | `#FFFFFF` | Cards, panels |
| Text Primary | `#0F172A` (Slate-900) | Headings, body text |
| Text Secondary | `#64748B` (Slate-500) | Labels, descriptions |
| Font | Inter | Google Font, modern sans-serif |

---

## 11. Intent → Color Mapping

| Intent | Color | Chip Style |
|--------|-------|-----------|
| POSITIVE_INTEREST | `#10B981` (green) | Filled green |
| MORE_INFO_REQUESTED | `#F59E0B` (amber) | Filled amber |
| NOT_INTERESTED | `#EF4444` (red) | Filled red |
| OUT_OF_OFFICE | `#6366F1` (indigo) | Outlined indigo |
| BOUNCE | `#94A3B8` (gray) | Outlined gray |
| UNKNOWN | `#CBD5E1` (light gray) | Outlined light gray |
