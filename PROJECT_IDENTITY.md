# PROJECT IDENTITY — Dimentions Audit Authenticator

> **🔒 Locked. Do not modify without Shubh's approval.**
> Owner: Shubh Krishna / Bluewud Industries

---

## What This Project Is

A React + Vite web application for auditing and synchronizing product dimension data from Bluewud's Excel master sheets into Zoho CRM.

**Core workflow:**
1. Load SKU/dimension data from Excel files (DimensionsMasterLatest.xlsx)
2. Authenticate with Zoho CRM via OAuth2
3. Compare local data vs Zoho CRM records
4. Bulk-update mismatched dimensions in Zoho (Parent_MTP_SKU + Products modules)

It is NOT a customer-facing app — it's an internal operations tool used by the Bluewud team.

---

## Deployment Target

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite (static build) |
| Hosting | Vercel (internal tool) or local dev only |
| Backend | No server — calls Zoho CRM API directly from browser via OAuth token |
| Data sync scripts | Node.js scripts in `scripts/` — run locally by operator |

---

## Approved Tech Stack

| Component | Approved |
|---|---|
| Framework | React 18 + Vite |
| Zoho integration | Zoho CRM REST API (via OAuth2) |
| Excel parsing | xlsx / SheetJS |
| Data scripts | Node.js (scripts/ folder) |

**Do NOT add:** databases, additional backends, new API integrations without approval.

---

## Folder Structure

```
src/                 — React frontend (audit UI)
  components/        — UI components
  services/          — Zoho API service layer
  context/           — Auth and data context
scripts/             — One-off Node.js data scripts (local only, not deployed)
ZohoIntegration/     — Zoho CRM integration module
ZohoIntegrationEngine/ — Catalyst serverless functions (Zoho backend)
.env.example         — Documents required env vars
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `ZOHO_CLIENT_ID` | Zoho OAuth app client ID |
| `ZOHO_CLIENT_SECRET` | Zoho OAuth app client secret |
| `ZOHO_REFRESH_TOKEN` | Long-lived refresh token for Zoho CRM |
| `ZOHO_ORG_ID` | Zoho organization ID |

Store in `.env.local` (gitignored). NEVER commit real values.

---

## Untouchable Files

- `.gitignore` — must keep credentials excluded
- `ZohoIntegrationEngine/` — Catalyst deploy config
- This file (`PROJECT_IDENTITY.md`)

---

## ⚠️ Credential Rotation Required

The following were previously exposed and must be rotated in Zoho API Console:
- Client ID: `1000.CGGK0M58LOXYJG9IR23UZ5G7XAZZBA` → GENERATE NEW
- Client Secret: `f60455449d30984...` → GENERATE NEW
- All refresh tokens in this repo's history → REVOKE ALL, generate new
