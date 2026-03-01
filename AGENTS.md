# AGENTS.md — Dimentions Audit Authenticator
# Universal AI context file. Read this first, regardless of which AI tool you are.
# Works with: Claude Code, MiniMax, Antigravity, OpenClaw, Codex, Cursor, Copilot

---

## Project Identity

- **Name:** Dimentions Audit Authenticator
- **Owner:** Shubh (Bluewud)
- **Platform:** Vercel (React 18 + Vite frontend)
- **Status:** Live / Internal Tool
- **Purpose:** Authenticates Zoho CRM sessions for the Dimentions Excel-to-CRM sync workflow. Handles the Zoho OAuth2 flow, then passes tokens to internal scripts that sync dimension/measurement data from Excel into Zoho CRM.

---

## Tech Stack

| Layer       | Tech                                           |
|-------------|------------------------------------------------|
| Frontend    | React 18 + Vite                                |
| Auth flow   | Zoho OAuth2 (client_id → auth code → tokens)  |
| Zoho app    | Shared with Asset Management Zoho (same client_id) |
| Deployment  | Vercel (`vercel --prod`)                       |
| Scripts     | Node.js scripts in `scripts/` for token exchange |

---

## CRITICAL WARNING — This Touches Live Zoho CRM Data

> The scripts in `scripts/` run against the **LIVE Zoho CRM production environment**.
> A bad script run can corrupt real customer/product dimension data.
> Always test API calls in Zoho sandbox first. Never bulk-update without Shubh's approval.

---

## Critical Rules — Any AI Must Follow

1. **Zoho credentials (`ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`) are SHARED** with Asset Management Zoho — rotating one rotates both.
2. **`ZOHO_AUTH_CODE` is a one-time use code** — it expires in 3 minutes. Never store it permanently.
3. **Never commit `.env`, `.env.development`, `.env.production`** — these are gitignored. Check before any git add.
4. **`refresh_token.txt` is gitignored** — it contains a live Zoho refresh token. Never commit it.
5. **`scripts/get-refresh-token.js` reads from `process.env`** — do not hardcode values back into the script.
6. **Use `VITE_` prefix** for any env var that needs to be accessible in the browser (Vite requirement).
7. **Never call `vercel --prod`** — Shubh deploys.

---

## File Structure (important files)

```
src/                    ← React app (Zoho auth UI)
scripts/
  get-refresh-token.js  ← Run once to exchange auth code for refresh token
  exchange_token.js     ← Token exchange utility
zoho-ai-generator/      ← Sub-tool for AI-assisted CRM field generation
  .env.example          ← Shows required vars for this sub-tool
.env.example            ← VITE_ZOHO_CLIENT_ID, VITE_ZOHO_CLIENT_SECRET, etc.
PROJECT_IDENTITY.md     ← Locked identity
```

---

## Zoho OAuth2 Flow (for context)

```
1. User opens app → redirected to Zoho auth page (client_id in URL)
2. User approves → Zoho returns auth code (one-time, 3-min TTL)
3. Run: ZOHO_AUTH_CODE=<code> node scripts/get-refresh-token.js
4. Script exchanges code for access_token + refresh_token
5. refresh_token stored in refresh_token.txt (gitignored, local only)
6. Subsequent API calls use refresh_token to get new access_tokens
```

---

## When Working on This Project

- Any OAuth scope change → Shubh must re-authorize the Zoho app (generates new auth code)
- Do not run `scripts/` against production without Shubh's explicit instruction
- The `zoho-ai-generator/` sub-folder has its own `.env.example` — treat it as a separate mini-project

---

## Handoff Protocol

When done: summarize changes, list modified files, flag TODOs. Do not deploy.
