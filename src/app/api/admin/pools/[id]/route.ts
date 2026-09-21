import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contributions, deposits, ledgerEntries, pools, receiptsPrivate } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const pool = await db.query.pools.findFirst({ where: eq(pools.id, id) });
  if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });

  const rows = await db
    .select({
      contributionId: contributions.id,
      depositId: deposits.id,
      allocatedAmount: contributions.allocatedAmount,
      contributionStatus: contributions.status,
      providerKey: deposits.providerKey,
      receiptRef: deposits.receiptRef,
      depositStatus: deposits.status,
      payerName: receiptsPrivate.payerName,
      createdAt: contributions.createdAt,
      pseudonym: ledgerEntries.pseudonym,
    })
    .from(contributions)
    .innerJoin(deposits, eq(deposits.id, contributions.depositId))
    .leftJoin(receiptsPrivate, eq(receiptsPrivate.depositId, deposits.id))
    .leftJoin(
      ledgerEntries,
      and(eq(ledgerEntries.contributionId, contributions.id), eq(ledgerEntries.type, "contribution"))
    )
    .where(eq(contributions.poolId, id))
    .orderBy(desc(contributions.createdAt));

  return NextResponse.json({ ok: true, pool, contributions: rows });
}