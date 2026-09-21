import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pools, ledgerEntries } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Public, pseudonymous ledger endpoint.
 * Invariant §3.4 / §11:
 * - Structurally separate read path: NEVER imports or queries receiptsPrivate or user tables.
 * - Raw response contains only public pool stats and pseudonymous ledger entries.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;

    const pool = await db.query.pools.findFirst({
      where: eq(pools.id, poolId),
      columns: {
        id: true,
        name: true,
        capAmount: true,
        currency: true,
        status: true,
        createdAt: true,
      },
    });

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    const entries = await db.query.ledgerEntries.findMany({
      where: eq(ledgerEntries.poolId, poolId),
      orderBy: [desc(ledgerEntries.createdAt)],
      columns: {
        id: true,
        pseudonym: true,
        type: true,
        amount: true,
        createdAt: true,
      },
    });

    const totalAllocated = entries.reduce(
      (sum, entry) =>
        entry.type === "contribution"
          ? sum + parseFloat(entry.amount)
          : entry.type === "refund"
          ? sum - parseFloat(entry.amount)
          : sum,
      0
    );

    const cap = parseFloat(pool.capAmount);
    const progress = cap > 0 ? Math.min(100, (totalAllocated / cap) * 100) : 0;

    return NextResponse.json({
      ok: true,
      pool: {
        id: pool.id,
        name: pool.name,
        capAmount: pool.capAmount,
        currency: pool.currency,
        status: pool.status,
        totalAllocated: totalAllocated.toFixed(2),
        progressPercentage: Number(progress.toFixed(2)),
      },
      entries,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
