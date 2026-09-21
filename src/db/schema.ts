import {
  pgTable,
  text,
  timestamp,
  boolean,
  numeric,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Better Auth Tables ---

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- Core Application Tables (PRD §15 / Build Plan §4) ---

/**
 * Shared pools towards a capped target.
 */
export const pools = pgTable("pools", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  purpose: text("purpose").notNull().default(""),
  beneficiary: text("beneficiary").notNull().default(""),
  paymentProvider: text("payment_provider"),
  paymentAccount: text("payment_account"),
  paymentInstructions: text("payment_instructions").notNull().default(""),
  capAmount: numeric("cap_amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("ETB"),
  status: text("status").notNull().default("open"), // open, capped, closed, paused
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Deposits submitted by users and verified via links.et.
 * Invariant §3.3: unique(provider_key, receipt_ref) prevents replay of the same receipt.
 */
export const deposits = pgTable(
  "deposits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerKey: text("provider_key").notNull(), // telebirr, cbe, cbebirr, etc.
    receiptRef: text("receipt_ref").notNull(), // reference for telebirr, resolvedUrl/id for others
    verifiedAmount: numeric("verified_amount", { precision: 14, scale: 2 }),
    status: text("status").notNull().default("draft"), // draft, submitted, verifying, verified, failed, disputed, resolved, waived
    linksEtRequestId: text("links_et_request_id"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("deposits_provider_receipt_unique").on(
      table.providerKey,
      table.receiptRef
    ),
  ]
);

/**
 * Portions of verified deposits allocated to specific pools.
 */
export const contributions = pgTable("contributions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  depositId: text("deposit_id")
    .notNull()
    .references(() => deposits.id, { onDelete: "cascade" }),
  poolId: text("pool_id")
    .notNull()
    .references(() => pools.id, { onDelete: "cascade" }),
  allocatedAmount: numeric("allocated_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  status: text("status").notNull().default("allocated"), // allocated, cancelled, refunded
  allocatedAt: timestamp("allocated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Append-only ledger entries for public tracking and audit history.
 * Invariant §3.4 / §11: Uses pseudonym, never contains contributor PII.
 * Invariant §3.5: Append-only, never updated or deleted.
 */
export const ledgerEntries = pgTable("ledger_entries", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  poolId: text("pool_id")
    .notNull()
    .references(() => pools.id, { onDelete: "cascade" }),
  contributionId: text("contribution_id").references(
    () => contributions.id,
    { onDelete: "set null" }
  ),
  pseudonym: text("pseudonym").notNull(), // non-reversible pseudonym (PRD §11)
  type: text("type").notNull(), // contribution, refund, waiver
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Admin-only table containing sensitive verified receipt data and bank payer name.
 * Invariant §3.4 / PRD §11: Structurally separated from public query paths.
 */
export const receiptsPrivate = pgTable("receipts_private", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  depositId: text("deposit_id")
    .notNull()
    .references(() => deposits.id, { onDelete: "cascade" }),
  rawReceiptJson: jsonb("raw_receipt_json").notNull(),
  payerName: text("payer_name"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Relations ---

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  deposits: many(deposits),
}));

export const poolsRelations = relations(pools, ({ many }) => ({
  contributions: many(contributions),
  ledgerEntries: many(ledgerEntries),
}));

export const depositsRelations = relations(deposits, ({ one, many }) => ({
  user: one(user, {
    fields: [deposits.userId],
    references: [user.id],
  }),
  contributions: many(contributions),
  receiptPrivate: one(receiptsPrivate, {
    fields: [deposits.id],
    references: [receiptsPrivate.depositId],
  }),
}));

export const contributionsRelations = relations(contributions, ({ one, many }) => ({
  deposit: one(deposits, {
    fields: [contributions.depositId],
    references: [deposits.id],
  }),
  pool: one(pools, {
    fields: [contributions.poolId],
    references: [pools.id],
  }),
  ledgerEntries: many(ledgerEntries),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  pool: one(pools, {
    fields: [ledgerEntries.poolId],
    references: [pools.id],
  }),
  contribution: one(contributions, {
    fields: [ledgerEntries.contributionId],
    references: [contributions.id],
  }),
}));

export const receiptsPrivateRelations = relations(receiptsPrivate, ({ one }) => ({
  deposit: one(deposits, {
    fields: [receiptsPrivate.depositId],
    references: [deposits.id],
  }),
}));
