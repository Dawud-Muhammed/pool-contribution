# Build Plan — You & Dawud

**Purpose of this doc:** the contractor-facing counterpart to `01-PRD.md`.
This is what's safe to hand Dawud; the full PRD stays with you. Anywhere
this doc says "you," it means you, not him.

## 1. Why Dawud, briefly

Picked from four candidates on the strength of his concurrency and
idempotency answers, and because he's the only one who linked a real repo
with working payment logic (`EthioShare` — Laravel + Chapa payment
requests + verification). Known gap: he's light on Next.js, which is this
project's stack — that's the first thing to have him confirm, not assume.
Yared is the fallback if the trial is missed or fails, kept warm but not
told he's a backup.

## 2. The trial

- **Task**: goal-tracker build (as scoped separately/earlier).
- **Deadline**: 3 hours.
- **Payment**: fixed USDT on delivery.
- **Before sending the task**: ask his stack choice first, unprompted —
  don't let him default to Laravel without saying so.

### What to check when he delivers

- [ ] Runs with the one command his README claims.
- [ ] **The real name does not appear in the raw API response for the
      anonymous row** — check the actual JSON, not just the rendered page.
      Hiding it only in the UI is a fail. *(This is invariant §3.4 /
      §11 in the PRD — it's the single check that matters most.)*
- [ ] He stated his stack before starting, as asked.
- [ ] Commit history in the repo is actually his (timestamps, style,
      consistent with prior work) — not a copy-paste dump.

## 3. What Dawud builds vs. what stays with you

**Give him** (safe — implementation mechanics, no business-sensitive
numbers):
- Project scaffolding: Next.js app, Drizzle schema migrations, Better Auth
  wiring (see `03-PROJECT-SETUP.md` — hand him that file directly).
- The links.et integration layer: the `/api/verify` client, retry/backoff
  logic, idempotency-key handling (see `04-LINKS-ET-INTEGRATION.md` — also
  safe to hand over as-is, it's third-party API docs distilled).
- The concurrency-safe allocation endpoint (atomic cap check) — this is
  exactly the kind of problem his screening answers showed he can do well;
  it doubles as a live verification of that trial answer.
- The append-only ledger writer and the public ledger endpoint — **with
  the explicit requirement that it's built as a structurally separate
  read path from anything touching the private receipt table**, not a
  shared serializer with a field filter.
- Standard CRUD: pools, deposits, contributions API routes per the schema
  in the PRD's §15–16 (reproduced for him below, stripped of the
  commentary around fees/legal/currency-risk open questions).

**Keep private / don't hand over as spec:**
- Exact cap amounts, fee structure, and USDT conversion approach (§7, §10
  of the PRD) — give him the *shape* (a numeric cap field, a currency
  field) without the real numbers if the project is still pre-launch.
- The legal/compliance section (§13) — not his concern, and discussing it
  with a contractor before you've gotten real advice just creates a paper
  trail of you flagging risk you haven't resolved.
- The unresolved repayment-trigger question (§8) — don't hand him an
  ambiguous spec to fill in on his own judgment; resolve it yourself first,
  then give him a decided rule.
- Admin runbooks (§14) — internal process, not app logic.

## 4. Reduced schema/API to hand him

Same as PRD §15–16, minus the private receipts table's business context —
just the shape, described as "an admin-only table for verified receipt
data, never joined into any public-facing query."

## 5. Milestones (adjust once he's confirmed his stack)

1. Project scaffold + auth + DB migrations running locally.
2. links.et integration behind a small internal client (submit, poll/SSE
   follow-up, idempotency) with unit tests against the documented error
   codes.
3. Deposit → allocation flow with the atomic cap check, tested against
   concurrent requests.
4. Public ledger endpoint + pseudonym assignment, with a test asserting no
   PII leak (PRD §17.4).
5. Admin actions (refund, waive) — stub is fine for v1 if repayment
   triggers aren't resolved yet.

## 6. Standing delegation notes

- Keep the same qualifying-question rigor going forward: if scope grows
  and you bring in help beyond Dawud, reuse the Q1/Q2 (concurrency,
  idempotency) style questions — they were the actual signal, per the
  screening notes; the "which app did you build" question mattered more
  than tool/plan questions.
- Don't discuss candidate comparisons, plan/tool usage, or rejected
  candidates with Dawud — irrelevant to the build and not his business.
