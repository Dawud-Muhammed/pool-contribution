# Project Setup

Stack: **Next.js** · **Neon** (serverless Postgres) · **Drizzle ORM** ·
**Better Auth** · **links.et** (receipt verification, server-side only)

This file is safe to hand to a contractor as-is.

## 1. Prerequisites

- Node.js (LTS) and a package manager (pnpm recommended for a Next.js +
  Drizzle setup, but npm/yarn work).
- A [Neon](https://neon.tech) project — grab the pooled connection string
  for the app and, if Drizzle migrations run separately, the direct
  (unpooled) connection string for migrations.
- A links.et API key from https://links.et/dashboard/keys — plaintext is
  shown once, so store it immediately.

## 2. Scaffold

```bash
npx create-next-app@latest . --typescript --app --eslint
```

## 3. Install core dependencies

```bash
npm install drizzle-orm @neondatabase/serverless better-auth
npm install -D drizzle-kit
```

## 4. Environment variables

Create `.env.local` (never committed — confirm it's in `.gitignore`):

```bash
# Database (Neon)
DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"

# Better Auth
BETTER_AUTH_SECRET="<generate a long random string>"
BETTER_AUTH_URL="http://localhost:3000"

# links.et — server-side only, never NEXT_PUBLIC_
LINKS_ET_API_KEY="vk_live_..."
```

Rules, not suggestions:
- Nothing above gets a `NEXT_PUBLIC_` prefix. If a value needs that prefix
  to work, it doesn't belong in this list — it means client code is trying
  to reach a server-only credential directly, which is the bug itself.
- `LINKS_ET_API_KEY` is only ever read inside server code (Route Handlers,
  Server Actions, or a server-only module) — never passed to a client
  component as a prop, never inlined into a `<script>`.

## 5. Drizzle setup

`drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

`src/db/index.ts`:

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);
```

Define the schema per `01-PRD.md` §15 / `02-BUILD-PLAN.md` §4, then:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

## 6. Better Auth setup

`src/lib/auth.ts`:

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: { enabled: true }, // adjust to your actual auth needs
});
```

Mount the handler at `src/app/api/auth/[...all]/route.ts` per Better
Auth's Next.js integration, and re-check server-side authorization (not
just session presence) on every money-moving route — see
`01-PRD.md` §12.

## 7. links.et client

Put this behind a single server-only module so nothing else in the app
talks to links.et directly — see `04-LINKS-ET-INTEGRATION.md` for the
actual request/response handling this wraps.

```ts
// src/lib/links-et.ts  — server-only
const LINKS_ET_BASE = "https://links.et";

export async function verifyReceipt(body: {
  url?: string;
  reference?: string;
  waitMs?: number;
}, idempotencyKey: string) {
  const res = await fetch(`${LINKS_ET_BASE}/api/verify`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.LINKS_ET_API_KEY!,
      "content-type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
```

## 8. Suggested folder structure

```
src/
  app/
    api/
      auth/[...all]/route.ts
      deposits/route.ts
      pools/[id]/allocate/route.ts
      pools/[id]/ledger/route.ts     -- public, pseudonymous only
    (routes/pages)
  db/
    schema.ts
    index.ts
  lib/
    auth.ts
    links-et.ts                      -- server-only, wraps links.et
drizzle/                              -- generated migrations
```

Keep anything that touches `receipts_private` (PRD §15) in modules that
are never imported by a file under `app/api/pools/[id]/ledger/` or any
other public-facing route — a folder-level convention makes the PRD's
"structurally separate read path" requirement (§11) easy to enforce and
easy to review.

## 9. Local dev

```bash
npm run dev
```

## 10. Deployment notes

**[ASSUMPTION — confirm your target host.]** Next.js on Vercel pairs
naturally with Neon (serverless driver, no connection-pool exhaustion
issues from short-lived functions). Whatever the host, set the same four
env vars from §4 there, and confirm `LINKS_ET_API_KEY` is marked
secret/hidden in that platform's dashboard, not a plain build-time var.
