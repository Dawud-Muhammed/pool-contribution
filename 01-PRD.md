# Product Requirements Document — Pool-Contribution App

**Status:** Private / internal. Not for the contractor.
**Stack:** Next.js · Neon (Postgres) · Drizzle ORM · Better Auth · links.et (receipt verification)

> A note on how this doc came to be: your uploaded file wasn't actually a
> product overview — it was a chat transcript (candidate screening, then a
> list of topics a draft PRD was going to cover). The bullet list at the end
> ("Planning the money model...", "Mapping verification edge cases...", etc.)
> was the outline, not the content. This document turns that outline into
> real requirements. Anywhere I had to make a judgment call because the
> transcript didn't specify one, it's marked **[ASSUMPTION]** — skim those
> first and correct anything I guessed wrong.

## 1. What this is

A web app where a group of people contribute money toward a shared, capped
pool. Contributions are made via Ethiopian bank/wallet transfer, verified
against the issuing bank's own receipt (not just a screenshot) via links.et,
and tracked on a ledger that's public in aggregate but doesn't expose who
contributed what. **[ASSUMPTION]** Final payout/settlement is in USDT,
based on "fixed USDT on delivery" being the payment term used with the
contractor — confirm whether that's also how *contributors* get paid out,
or just how the contractor is paid.

## 2. Actors

- **Contributor** — sends money, submits a receipt, sees their own
  contribution status and the public ledger.
- **Admin (you)** — creates pools, sets caps, resolves disputed receipts,
  issues refunds/waivers, closes pools.
- **Anonymous viewer** — anyone with the link; sees the public ledger but
  never a contributor's real name or contact info.

## 3. Core invariants

These hold regardless of which edge case is in play. Anything that breaks
one of these is a bug, not a design choice:

1. **A pool never accepts more than its cap in confirmed contributions.**
   The check-and-commit has to be atomic — see §9 (Concurrency). "I checked
   the running total first" is a race condition, not a fix.
2. **A contribution only counts once it's verified.** An unverified deposit
   is not a contribution yet (see §5, Deposits vs. Contributions).
3. **A receipt can be applied to at most one contribution, ever.** Enforce
   this with a DB unique constraint on `(providerKey, receipt-identifying
   field)` — not just an application-level check — so the same telebirr
   reference can't be replayed against a second contribution.
4. **The public API/ledger never contains a contributor's real name,
   phone number, or raw receipt data — full stop, not just hidden in the
   UI.** This is the single most important invariant in the system. The
   verified receipt (which does carry the payer's real name from the bank)
   is PII and stays server-side only, in an access-scoped table, never
   serialized into any response a browser or a public endpoint can see.
   *(This is also the exact thing the trial task checks for — see
   `03-BUILD-PLAN.md`.)*
5. **Ledger entries are append-only.** Corrections happen via a new
   offsetting entry, never an UPDATE/DELETE on a settled row, so the
   history stays auditable.
6. **Every write to money-affecting state is idempotent** at the API layer
   (idempotency key tied to a logical operation — a specific deposit
   submission, a specific verification attempt) so client retries on flaky
   networks can't double-apply anything.

## 4. Contribution lifecycle / states

```
draft → submitted → verifying → verified → allocated
                         ↓            ↓
                      failed      disputed → resolved (allocated | refunded)
                                              ↘ waived
```

- **draft** — user has entered an amount, no receipt yet.
- **submitted** — receipt (URL, telebirr reference, or screenshot) attached.
- **verifying** — links.et call in flight (sync, or async via `waitMs` +
  poll/SSE — see `04-LINKS-ET-INTEGRATION.md`).
- **verified** — links.et returned `ok: true` and the parsed amount /
  destination match what was expected.
- **failed** — links.et returned an error, or the receipt didn't match
  (wrong amount, wrong destination, expired/reused receipt). User can retry
  with a new receipt; the old submission stays in the audit trail as
  `failed`, it isn't deleted.
- **allocated** — verified amount has been applied to the pool's running
  total. This is the step gated by the cap invariant (§3.1).
- **disputed** — admin has flagged a mismatch for manual review (see §6).
- **waived** — admin manually excuses a shortfall or exception (see §8).

## 5. Money model: deposits vs. contributions

**[ASSUMPTION]** — the transcript explicitly calls out "Separating deposits
from contributions to model overflow cases" as a planned topic, so this
distinction is load-bearing even though its exact rules weren't spelled
out. Proposed model:

- A **deposit** is money a user has sent and had verified by links.et. It
  exists independent of any pool.
- A **contribution** is a deposit (or portion of one) *allocated* to a
  specific pool, subject to that pool's remaining capacity.
- Why separate them: it's what makes overflow safe. If a verified deposit
  would push a pool over its cap, the deposit still exists (it's real,
  verified money) — only the *allocation* is capped. The excess sits as an
  unallocated deposit that the admin can refund, roll into a waitlist, or
  apply to the contributor's next pool, instead of forcing you to either
  silently over-fill the pool or "undo" a bank transfer that already
  happened.

## 6. Verification edge cases (receipt fraud & mismatches)

- **Amount mismatch** — receipt amount ≠ pledged amount. Default: don't
  auto-allocate; route to `disputed` for the smaller of (verified amount,
  pledged amount) or for admin judgment. **[ASSUMPTION]** — decide whether
  underpayment auto-allocates the lesser amount or always needs a human.
- **Destination mismatch** — receipt shows a transfer to an account that
  isn't your collection account. Auto-fail, no manual override without
  independently confirming the sender's intent.
- **Reused receipt** — same `(providerKey, reference/resolvedUrl)` submitted
  twice, possibly by two different users (a screenshot can be shared).
  Blocked by the unique constraint in §3.3; second submitter sees "receipt
  already used," not a confusing generic error.
- **Screenshot-only submissions** — go through `/api/verify-image`, which
  chains into `/api/verify` for the actual bank-side receipt. Per links.et's
  docs, only trust `upstream.result.receipt`, never the detector's own
  provider/reference guess — that's a read aid, not evidence.
- **Bank/provider outage** — links.et returns `503 provider_down` or a
  timeout-as-400. Don't treat as receipt fraud; treat as "can't verify
  right now," queue for retry per links.et's retry rules (see
  `04-LINKS-ET-INTEGRATION.md`), and don't lock the user out.
- **Siinqee receipts** — view-limited (~5 views total). Never retried
  automatically; a failed Siinqee verification needs a fresh receipt from
  the user, not a re-fetch of the same URL.

## 7. Fees & reconciliation

**[ASSUMPTION]** — not specified in the source material. Decide and document:

- Does links.et's per-verification cost get absorbed by you, or does it
  factor into the pool's target amount?
- Bank-side transfer fees (deducted before the receipt amount, or added by
  the sender) — the verified `receipt` amount is what actually landed;
  reconcile against pledged amount using that, not the amount the user
  typed in the UI.
- Periodic reconciliation job: sum of `allocated` contributions per pool
  should equal the pool's running total at all times — a scheduled check
  that alerts if they drift (catches bugs, not just fraud).

## 8. Caps, cancellations, waivers, repayment triggers

- **Cap** — hard ceiling on total allocated contributions per pool (§3.1).
- **Cancellation** — a contributor withdraws a `submitted`/`verifying`
  pledge before allocation: free, no money has moved through the ledger
  yet (a verified-but-unallocated deposit is a refund, not a cancellation).
- **Waiver** — admin manually marks a shortfall as excused (e.g., partial
  payment accepted as final). Must still go through the append-only ledger
  as an explicit entry, not a silent edit to the target amount.
- **Repayment trigger** — **[ASSUMPTION, needs your input]** — if this pool
  involves installments (§9) or a payout that later needs to be reversed
  (e.g., a contributor's receipt is later found fraudulent after
  allocation), what recovers the money? Define this before build — it's
  the highest-risk unanswered question in the doc.

## 9. Installments, payout rules, default terms

**[ASSUMPTION]** — "Designing installment splits, payout rules, and default
terms" was listed but not detailed. Baseline to confirm or replace:

- A contributor can pledge a total and pay in multiple verified deposits;
  each deposit is allocated independently as it verifies, contributing
  partial progress toward their pledge.
- **Default** = pledged but with an outstanding balance past an agreed
  date. Define: does the pool proceed without them (their allocated
  partial amount stays; the shortfall becomes someone else's opportunity
  to top up), or does the whole pool pause?
- Payout rule (to whoever the pool is *for*, once cap is reached): define
  the trigger precisely — "cap reached" is the obvious one, but should
  there be a manual admin confirmation step before funds actually move,
  given §11 (fraud can surface late)?

## 10. Currency risk

Contributions arrive in ETB via Ethiopian banks/wallets; **[ASSUMPTION]**
the eventual payout is denominated in USDT. Decide and record:

- Rate locked at contribution time, at allocation time, or at payout time?
  Each has different fairness/risk trade-offs for contributors vs. the pool.
- Where the FX conversion actually happens (manual, or via an exchange
  API) — out of scope for links.et, which only verifies ETB-side receipts.

## 11. Anonymous ledger privacy safeguards

- Public ledger shows: amount, timestamp, pool progress, and a
  non-reversible pseudonym (e.g., a short random handle assigned at first
  contribution) — never name, phone, or receipt reference.
- The verified receipt (which *does* contain the real name, from the bank)
  is stored in a separate, non-public table, access-scoped to admin-only
  server code, and never touched by any handler that also serves public
  responses. Don't rely on a shared serializer with a field filter — use a
  structurally separate read path, so a future bug in the public endpoint
  can't accidentally expose it (this is the concrete implementation of
  invariant §3.4).
- Screenshots submitted to `/api/verify-image` are retained by links.et for
  90 days (their policy, not yours) — reflect that in your own privacy
  notice if you're relaying users' screenshots to them.

## 12. Security & concurrency safeguards

- **Cap race** (the exact scenario used in the screening question): atomic
  conditional update — `UPDATE pools SET allocated = allocated + $amt
  WHERE allocated + $amt <= cap` — or a row lock inside a transaction.
  Checking the running total in application code first and writing after
  is the race condition, not a guard against it.
- **API keys / secrets** (`LINKS_ET_API_KEY`, DB creds, Better Auth
  secrets) live in server-side env vars only, never `NEXT_PUBLIC_*`, never
  referenced from client components.
- **AuthN vs AuthZ**: Better Auth handles who a user is; every
  money-moving route (submit deposit, allocate, refund, waive) re-checks
  authorization server-side — a disabled button or hidden admin UI on the
  frontend is not access control.
- **Idempotency**: reuse links.et's own `Idempotency-Key` pattern for your
  own `/api/deposits` and `/api/allocate` routes, keyed per logical
  operation, so a retried submit can't double-verify or double-allocate.
- **Receipt URLs are credentials** — per links.et's own guidance, never log
  them, never put them in an error message, never paste them into a bug
  report or ticket.

## 13. Legal, compliance, cross-border risk

**[ASSUMPTION — get real advice here, this section is a flag, not a plan.]**

- Pooling third-party funds toward a capped target and later disbursing
  them can trigger money-transmission / remittance regulation depending on
  jurisdiction and structure — this needs an actual legal read, not an
  engineering judgment call.
- Cross-border angle: contributions in ETB, payout in USDT — check whether
  this implicates Ethiopian foreign-exchange controls specifically.
- Data residency/privacy: receipts contain PII (§11) — confirm what, if
  any, retention/consent obligations apply.

## 14. Trust safeguards, refunds, notifications, admin runbooks

- **Refunds**: unallocated verified deposits (overflow, cancellations) are
  refundable; define the actual repayment mechanism (manual bank transfer
  back, since you likely can't push money back through links.et — it's
  read-only/verification, not a payment rail).
- **Notifications**: contributor should be notified on `verified`,
  `failed` (with a reason and next step), and `disputed`. Admin should be
  notified when a receipt mismatches or a bank is degraded
  (`GET /api/status` — see `04-LINKS-ET-INTEGRATION.md`).
- **Admin runbook — "receipt failed verification"**: check
  `GET /api/status` for a provider outage first; if the provider's healthy,
  check `error.code` against the retry table before assuming fraud.
- **Admin runbook — "cap reached but a dispute is later upheld against an
  allocated contribution"**: ties back to the open §8 repayment-trigger
  question — resolve that before this runbook can be written for real.

## 15. Schema sketch (starting point, not final)

```
pools           (id, name, cap_amount, currency, status, created_at)
users           (id, ...  — via Better Auth)
deposits        (id, user_id, provider_key, receipt_ref, verified_amount,
                 status, links_et_request_id, verified_at)
contributions   (id, deposit_id, pool_id, allocated_amount, status,
                 allocated_at)
ledger_entries  (id, pool_id, contribution_id, type, amount, created_at)  -- append-only
receipts_private(id, deposit_id, raw_receipt_json, payer_name, fetched_at) -- admin-only table
```

`deposits.provider_key` + a provider-appropriate unique identifier
(reference for telebirr, `resolvedUrl` for others) carries a unique
constraint to enforce §3.3.

## 16. API surface (starting point)

```
POST   /api/deposits                 create + submit a receipt for verification
GET    /api/deposits/:id             status (public-safe fields only)
POST   /api/pools/:id/allocate       allocate a verified deposit (admin or auto)
GET    /api/pools/:id/ledger         public, pseudonymous
POST   /api/pools/:id/refund         admin
POST   /api/pools/:id/waive          admin
```

Internally, deposit verification calls out to links.et per
`04-LINKS-ET-INTEGRATION.md` — that's server-to-server, never exposed as a
pass-through endpoint to the client.

## 17. Testing priorities

1. Concurrency: two simultaneous allocations that would together exceed
   the cap — only one should succeed. (Mirrors the screening question —
   write this as the first integration test.)
2. Idempotent retry: submit the same deposit twice with the same
   idempotency key — exactly one deposit record, one links.et call.
3. Receipt reuse: same receipt submitted against two different deposits —
   second one rejected.
4. Public ledger fixture test: assert the serialized response for
   `/api/pools/:id/ledger` contains none of {name, phone, receipt_ref,
   raw_receipt_json} even when those fields exist in the underlying joins.
5. Provider outage simulation: links.et returns `503 provider_down` —
   deposit goes to a retryable state, not `failed`.

## 18. Safe-to-share appendix

What's fine to hand the contractor as-is vs. what should be summarized or
withheld — see `03-BUILD-PLAN.md`, which is the redacted, contractor-facing
counterpart to this document.
