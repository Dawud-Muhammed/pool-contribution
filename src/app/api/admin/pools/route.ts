import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contributions, pools } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: pools.id,
      name: pools.name,
      purpose: pools.purpose,
      beneficiary: pools.beneficiary,
      paymentProvider: pools.paymentProvider,
      paymentAccount: pools.paymentAccount,
      paymentInstructions: pools.paymentInstructions,
      capAmount: pools.capAmount,
      currency: pools.currency,
      status: pools.status,
      createdAt: pools.createdAt,
      totalAllocated: sql<string>`coalesce(sum(${contributions.allocatedAmount}), 0)`,
    })
    .from(pools)
    .leftJoin(contributions, eq(contributions.poolId, pools.id))
    .groupBy(pools.id)
    .orderBy(desc(pools.createdAt));

  return NextResponse.json({ ok: true, pools: rows });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, purpose, beneficiary, capAmount, currency, paymentProvider, paymentAccount, paymentInstructions } = body;
    if (!name || !purpose || !beneficiary || !capAmount || !paymentProvider || !paymentAccount || !paymentInstructions) {
      return NextResponse.json({ error: "Name, purpose, beneficiary, cap, payment provider, payment account, and instructions are required." }, { status: 400 });
    }

    const cap = Number(capAmount);
    if (!Number.isFinite(cap) || cap <= 0) {
      return NextResponse.json({ error: "Cap amount must be greater than zero." }, { status: 400 });
    }

    const [pool] = await db.insert(pools).values({
      id: crypto.randomUUID(),
      name: String(name).trim(),
      purpose: String(purpose).trim(),
      beneficiary: String(beneficiary).trim(),
      capAmount: cap.toFixed(2),
      currency: currency || "ETB",
      paymentProvider: String(paymentProvider).trim(),
      paymentAccount: String(paymentAccount).trim(),
      paymentInstructions: String(paymentInstructions).trim(),
      status: "open",
    }).returning();

    return NextResponse.json({ ok: true, pool }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create pool" }, { status: 500 });
  }
}