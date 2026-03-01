# CLAUDE.md — Dimentions Audit Authenticator (Claude Code Extension)
# This file extends AGENTS.md with Claude Code-specific context.
# READ AGENTS.md FIRST — all architecture, rules, and project identity live there.

---

## Claude Code Notes

- **VITE_ prefix required** for any env var accessible in the browser. Backend-only vars (in `scripts/`) don't need the prefix.
- **React 18 + Vite**: this is a standard Vite app. `npm run dev` → local dev server, `npm run build` → `dist/`
- **Zoho OAuth flow is stateful**: the auth code from Zoho is one-time use. If it fails, Shubh must re-authorize in the Zoho console.
- **`scripts/` are Node.js CLI scripts** — run with `node scripts/get-refresh-token.js`, not in the browser.
- **`zoho-ai-generator/`** is a sub-project — treat it independently with its own `.env.example`.

## Useful Claude Code Commands for This Project

```bash
# Start dev server
npm run dev

# Check what env vars are used
grep -r "process.env\|import.meta.env" src/ scripts/

# Exchange token (after Shubh gets auth code from Zoho)
ZOHO_AUTH_CODE=<code> ZOHO_CLIENT_ID=<id> ZOHO_CLIENT_SECRET=<secret> node scripts/get-refresh-token.js
```

## What to Read Before Touching Code

1. `AGENTS.md` — project rules, CRITICAL warnings about live CRM data, OAuth flow
2. `PROJECT_IDENTITY.md` — locked identity + shared credential note
3. `.env.example` — required env var names
4. `scripts/get-refresh-token.js` — understand the token exchange before modifying
