# How links.et Works (and how this project uses it)

Source: https://links.et/agents.md and
https://links.et/docs/integration-flows.md — this file distills those for
this project. Full reference if something's missing here:
https://links.et/llms-full.txt. Safe to hand to a contractor as-is; it's
third-party API documentation, no project-sensitive numbers in it.

## 1. What it does

links.et verifies Ethiopian payment receipts **at the source** — you give
it a receipt URL (or a telebirr reference, or a screenshot), it fetches
the receipt from the issuing bank over an Ethiopia-egress link, parses it,
and returns structured JSON. Covers 17 banks/wallets through one response
envelope. This is why it's in the stack: a backend outside Ethiopia can't
reach these banks directly, and a user-typed amount isn't evidence — a
bank-fetched receipt is.

## 2. Base URL, auth

```
Base URL: https://links.et
Header:   x-api-key: $LINKS_ET_API_KEY
```

- Key format: `vk_live_...`, minted at https://links.et/dashboard/keys,
  shown once.
- **Server-side credential only.** Never sent from a browser, never in
  client bundles — see `03-PROJECT-SETUP.md` §4 for how the env var is
  scoped in this project.

## 3. The two endpoints

### `POST /api/verify` — verify one receipt

Body takes exactly one of:

| Field | Notes |
|---|---|
| `url` | Full receipt URL. Works for any supported provider. |
| `reference` | telebirr only — shorthand for the telebirr receipt URL. |

Optional `waitMs` (see §5 — sync vs. async). Optional `Idempotency-Key`
header — **always set this in our client**, keyed to our own deposit ID,
so a retried submit never double-verifies (ties into PRD §3.6 and §12).

Success:

```json
{
  "ok": true,
  "providerKey": "telebirr",
  "resolvedUrl": "...",
  "httpStatus": 200,
  "fetchedAt": "2026-01-01T00:00:00.000Z",
  "receipt": { "source": "telebirr-html", "...": "..." }
}
```

**Switch on `receipt.source`, never on the host or `providerKey`** —
several banks serve receipts from more than one host, and two providers
share a host.

| `source` | Provider |
|---|---|
| `telebirr-html` | telebirr |
| `cbe-pdf` | CBE, PDF receipt |
| `mb-json` | CBE, mobile banking JSON |
| `cbebirr-pdf` | CBE Birr |
| `boa-json` | Bank of Abyssinia |
| `zemen-pdf` | Zemen Bank |
| `awash-html` | Awash Bank |
| `dashen-pdf` / `dashen-html` | Dashen Bank / Super App |
| `mpesa-pdf` | M-PESA |
| `ebirr-html` | COOPay Ebirr, Kaafi Ebirr |
| `amhara-json` | Amhara Bank |
| `abay-html` | Abay Bank |
| `berhan-pdf` | Berhan Bank |
| `oromia-pdf` | Oromia Bank |
| `ahadu-pdf` | Ahadu Bank |
| `siinqee-pdf` | Siinqee Bank |
| `zamzam-json` | ZamZam Bank |
| `hulubeje-dxxrdv` | HuluBeje POS |

**Amount parsing is per-source, not universal.** CBE/Zemen/BoA/JSON
sources return numbers; telebirr returns strings like `"100 Birr"`; Awash
returns `"100 ETB"`. Never feed the raw field straight into arithmetic —
parse per `receipt.source` (full field docs:
https://links.et/docs/verify.md) before comparing against a pledged
amount (PRD §6, amount mismatch).

### `POST /api/verify-image` — verify from a screenshot

```json
{ "images": [{ "imageBase64": "<base64 JPEG or PNG>" }] }
```

Up to 5 images of the same transaction, 5 MB base64 each, billed as one
call regardless of image count.

**The AI detector's output is not the receipt** — it only gives provider,
reference, and a confidence score, then chains into `/api/verify`
internally. Only trust `upstream.result.receipt`. Screenshots are
retained by links.et for 90 days for audit purposes — reflect that in our
own privacy notice since we're relaying users' images to them.

## 4. Response envelope & errors

Every error has the same shape:

```json
{ "ok": false, "error": { "code": "rate_limited", "message": "..." } }
```

| HTTP | Code | Our retry rule |
|---|---|---|
| 400 | `invalid_json`, `invalid_request` | No — fix the request body, this is our bug. |
| 400 | *(none)* | Yes, with backoff — no upstream status was reached (bad URL, or gave up waiting for a busy bank). |
| 401 | `missing_key`, `invalid_key`, `revoked_key` | No — key problem, alert us, don't retry the user's receipt. |
| 429 | `rate_limited` | Yes, after `Retry-After`. |
| 429 | `quota_exceeded` | No short retry — `Retry-After` can be days out; surface to admin, don't loop. |
| 429 | `image_cap_reached` | No short retry — monthly screenshot cap spent. |
| 429 | `ocr_daily_cap_reached` | Yes, later — links.et's shared budget, not ours. |
| 502 | *(none)* | Yes, 1–2s with jitter — bank answered but receipt failed validation; a partial `receipt` is included. |
| 503 | `provider_down` | Yes, after `Retry-After` (~300s) — never counts against our cap. |
| 503 | `ai_not_configured` | No — image extraction isn't set up on this deployment. |

There's no 504 — a true timeout comes back as a 400 with the reason in
`error`, so treat that specific 400 as retryable, not as "bad request."

**Three consecutive 502s or busy-bank 400s = treat as a real outage**, not
something to keep silently retrying — surface it (see PRD §14, admin
runbook).

## 5. Sync vs. async — which we use where

`/api/verify` defaults to **synchronous**: it blocks until the bank
answers. A cache hit is instant; an uncached receipt against a busy bank
can hold the connection well over a minute (links.et queues for an
upstream slot up to 120s, then fetches for 20s, then retries once on a
different egress for 20s).

| Flow | When we use it |
|---|---|
| **Sync (default)** | Not recommended as our default — see below. |
| **Short wait** (`waitMs`) | **Our default for user-submitted receipts.** Submit with `waitMs: 2000`; a cache hit returns immediately, anything slower falls into async follow-up instead of holding the request open. |
| **Polling** | Background reconciliation jobs, or as SSE fallback. |
| **SSE** | While the user is watching a "verifying..." state in the UI. |

Recommended pattern for our deposit-submission endpoint: submit with
`waitMs: 2000`. On `200`/`502`, we're done. On `202`, open SSE against
`eventsUrl` for the live UI; if that connection drops, fall back to
polling `statusUrl` every 1.5–3s. This keeps our own API routes from
holding a serverless function open for a minute-plus on a slow bank.

`waitMs` is capped at 30000ms server-side (silently clamped above that).
SSE streams cap at 5 minutes and replay the last event on reconnect for
~5 minutes after that; polling (`GET {statusUrl}`) resolves forever
regardless.

A poll counts against the per-minute rate limit but **never** against the
verification cap — only the original submit can spend an uncached
verification.

## 6. Limits

- **60 requests/minute per key** — over it, `429 rate_limited` +
  `Retry-After`.
- **Verification cap** — per plan/window, uncached successful
  verifications only. Cache hits and failed lookups are free.
- **Screenshot reads** — separate monthly cap.
- Plan details: https://links.et/docs/rate-limits.md

## 7. Health checks

Both open, no key required:

- `GET /api/verify` → `{ ok: true, ts: ... }` — is links.et itself up.
- `GET /api/status` → per-component status, `503` when overall status is
  down. Use this in the admin runbook (PRD §14) to distinguish "this bank
  is degraded" from "our integration is broken."

## 8. Rules that are easy to get wrong (from links.et directly)

1. Switch on `receipt.source`, never on host or `providerKey`.
2. **Never retry a Siinqee link** — those receipts allow ~5 views total;
   a retry loop can destroy the receipt for the user.
3. `quota_exceeded` ≠ `rate_limited` — different wait semantics, handle
   separately (§4 table already reflects this).
4. **A receipt URL is a credential** — it's a lookup key for someone's
   bank transaction. Never log it, never put it in a client-facing error
   message, never paste it into a bug report (this is also called out in
   PRD §12 as a general security rule for this project).
5. The public demo endpoints (`/api/demo-verify*`) are IP-metered, keyless,
   and not for production use — don't build against them by accident.
6. Amount fields are numbers on some providers, strings on others — never
   feed them straight into arithmetic (§3 above).

## 9. Where this plugs into our schema/API

- Every `deposits` row (PRD §15) stores the links.et `requestId` it was
  verified under, for audit and for resuming an in-flight async
  verification after a server restart.
- Our `Idempotency-Key` sent to links.et is derived from our own deposit
  ID (e.g. `deposit:{id}`), not a random UUID per attempt — so a retried
  submission from our own client is provably the same logical operation.
- `receipt.source` plus the parsed amount/destination feed directly into
  the amount/destination-mismatch checks in PRD §6.
