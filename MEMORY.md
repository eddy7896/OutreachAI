# 🧠 Project Memory — Email Outreach Platform

> This file tracks all decisions, conventions, patterns, known issues, and important notes accumulated during development. It serves as persistent memory across sessions.
>
> **Convention**: Append new entries at the TOP of each section (newest first). Never delete entries — mark obsolete ones with ~~strikethrough~~.

---

## 📋 Active Decisions Log

| Date | Decision | Context | Decided By |
|------|----------|---------|-----------|
| 2026-06-19 | Use Firebase Cloud Functions with desktop notification fallback | Cloud Functions handle scheduled sends (15 min) and follow-ups (1 hr). If unavailable, dashboard fires browser Notification API on load. | User |
| 2026-06-19 | A/B tree builder for sequences (not linear) | User wants visual drag-and-drop tree with branching paths based on reply conditions | User |
| 2026-06-19 | Product Registry with AI context fields | Free-form products, not fixed list. Each product has description, value prop, features, differentiators — feeds AI generation | User |
| 2026-06-19 | Auto-format emails on lead upload | When leads are imported, system auto-generates personalized email content per lead using Gemini + product context | User |
| 2026-06-19 | Max 20-30 emails/day | Low volume, Resend free tier sufficient | User |
| 2026-06-19 | Light mode only, Material UI v6 | No dark mode toggle. MUI for component library. | User |
| 2026-06-19 | No authentication | Internal tool, no external users | User |
| 2026-06-19 | .env for API keys | Gemini + Resend API keys hardcoded in .env.local | User |
| 2026-06-19 | Next.js 15 (App Router) | Full-stack React framework | User |
| 2026-06-19 | Firebase Firestore for database | User preference, already in Firebase ecosystem | User |
| 2026-06-19 | Google Gemini API for AI | User preference over OpenAI/Claude | User |
| 2026-06-19 | Resend for email sending | User already has verified domain | User |

---

## 🏗️ Architecture Patterns

### Component Pattern
- **Page components** live in `src/app/[route]/page.tsx`
- **Reusable components** live in `src/components/[feature]/`
- **Shared components** live in `src/components/shared/`
- **Layout components** live in `src/components/layout/`

### Data Layer Pattern
- **Custom hooks** (`src/hooks/use[Entity].ts`) handle all Firestore CRUD operations
- Hooks use Firestore real-time listeners (`onSnapshot`) for live data
- All Firestore logic is centralized — components never call Firestore directly

### API Route Pattern
- API routes live in `src/app/api/[action]/route.ts`
- All AI calls (Gemini) go through API routes (server-side only — API keys stay on server)
- All email sends (Resend) go through API routes
- Client components call API routes via `fetch()`

### State Management
- No global state library (Redux, Zustand, etc.)
- React hooks + Firestore listeners provide reactive state
- Component-local state via `useState` / `useReducer`

---

## 📐 Code Conventions

### Naming
- **Files**: PascalCase for components (`LeadTable.tsx`), camelCase for utilities/hooks (`useLeads.ts`)
- **Components**: PascalCase (`StatsCards`, `IntentResultCard`)
- **Hooks**: `use` prefix, camelCase (`useLeads`, `useNotifications`)
- **API routes**: kebab-case directories (`/api/send-bulk/`, `/api/pending-actions/`)
- **Types/Interfaces**: PascalCase, no `I` prefix (`Lead`, not `ILead`)
- **Firestore collections**: lowercase plural (`leads`, `campaigns`, `templates`)

### Imports
- Absolute imports via `@/` alias mapping to `src/`
- Group imports: React → MUI → Firebase → Internal libs → Components → Types

### TypeScript
- Strict mode enabled
- All types defined in `src/types/index.ts`
- No `any` type — use `unknown` and narrow

### Styling
- MUI `sx` prop for component-level styles
- MUI theme tokens for all colors, spacing, typography
- No inline hex colors — always reference theme palette

---

## 🗂️ Firestore Indexes Needed

> Firestore will prompt to create these when queries fail. Document them here proactively.

| Collection | Fields | Order | Purpose |
|-----------|--------|-------|---------|
| `emails` | `campaignId`, `createdAt` | ASC, DESC | Campaign email history |
| `emails` | `leadId`, `direction` | ASC, ASC | Lead's sent/received emails |
| `emails` | `status`, `scheduledAt` | ASC, ASC | Pending scheduled sends |
| `leads` | `campaignId`, `status` | ASC, ASC | Campaign lead filtering |
| `leads` | `targetProduct`, `industry` | ASC, ASC | Product/industry filtering |

---

## 🐛 Known Issues & Gotchas

> Document issues encountered during development here.

| Date | Issue | Status | Resolution |
|------|-------|--------|-----------|
| — | — | — | — |

---

## 📦 Dependencies & Versions

> Track exact versions installed to prevent drift.

| Package | Version | Purpose |
|---------|---------|---------|
| — | — | Will be populated after `npm install` |

---

## 🔄 Migration Notes

> Track any data model changes or breaking changes here.

| Date | Change | Migration Required |
|------|--------|--------------------|
| — | Initial schema | No — fresh start |

---

## 💡 Future Enhancements (Parked)

> Ideas discussed but not in current scope.

| Idea | Why Parked |
|------|-----------|
| Email open tracking | Requires webhook setup, out of MVP scope |
| Dark mode | User chose light-only for now |
| Multi-user auth | Internal tool, single user for now |
| Webhook-based reply ingestion | Currently manual paste/upload for reply classification |
| AI-powered reply drafting | Could auto-draft responses to classified emails |

---

## 🔑 Environment Setup Checklist

- [ ] Firebase project created (Blaze plan for Cloud Functions)
- [ ] Firestore database created in Firebase console
- [ ] Firestore rules set to allow all (internal tool)
- [ ] Gemini API key obtained from Google AI Studio
- [ ] Resend API key obtained + domain verified
- [ ] `.env.local` populated with all keys
- [ ] Firebase Cloud Functions deployed (`functions/` directory)

---

## 📊 Build Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Foundation | ✅ Done | Next.js init, MUI theme, Firebase, types |
| 2. Layout & Navigation | ✅ Done | Sidebar, TopBar, routing |
| 3. Product Registry | ✅ Done | CRUD for products/services |
| 4. Lead Management | ✅ Done | Import, table, CRUD, auto-format |
| 5. Email Classification | ✅ Done | Single + bulk, Gemini integration |
| 6. Templates & AI Generator | ✅ Done | Template editor, AI compose |
| 7. Campaigns & Sequences | ✅ Done | A/B tree builder |
| 8. Email Sending | ✅ Done | Individual, bulk, Resend |
| 9. Cloud Functions | 🔄 In progress | Scheduled sends, follow-ups |
| 10. Dashboard & Analytics | ✅ Done | Charts, funnels, notifications fallback |
