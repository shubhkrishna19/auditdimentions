# Tasks — Dimentions Audit Authenticator

## Protocol
Before claiming a task: read AGENTS.md + COORDINATION.md (in BluewudOrchestrator/).
Claim a task by moving it to IN PROGRESS with your agent tag [CLAUDE]/[CODEX-XX]/[MINIMAX]/[OPENCLAW].
Always work on a branch: feat/[agent]-T[id]-[slug]. Never commit directly to main.
⚠️ CRITICAL: Scripts run against LIVE CRM data. Never run scripts/ without Shubh's explicit approval.

## PENDING
- [ ] [T-001] Add error handling for expired refresh tokens — auto-prompt re-auth flow (Priority: HIGH)
- [ ] [T-002] Add dry-run mode to scripts/ that shows what would change without writing to CRM (Priority: HIGH)
- [ ] [T-003] Add progress bar/counter to bulk dimension sync scripts (Priority: MED)
- [ ] [T-004] Write validation to check Excel row format before attempting CRM sync (Priority: MED)
- [ ] [T-005] Add audit log file that records every CRM write (timestamp, field, old val, new val) (Priority: HIGH)

## IN PROGRESS
(none)

## DONE
(none yet — project initialized)
