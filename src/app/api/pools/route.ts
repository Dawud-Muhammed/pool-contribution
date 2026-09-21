import { NextResponse } from "next/server";
import { db } from "@/db";
import { contributions, pools } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: pools.id,
        name: pools.name,
        capAmount: pools.capAmount,
        currency: pools.currency,
        status: pools.status,
        createdAt: pools.createdAt,
        totalAllocated: sql<string>`coalesce(sum(${contributions.allocatedAmount}), 0)`,
      })
      .from(pools)
      .leftJoin(contributions, eq(contributions.poolId, pools.id))
      .groupBy(pools.id)
      .orderBy(pools.createdAt);

    return NextResponse.json({
      ok: true,
      pools: rows.map((pool) => {
        const cap = Number(pool.capAmount);
        const total = Number(pool.totalAllocated);
        return {
          ...pool,
          totalAllocated: total.toFixed(2),
          progressPercentage: cap > 0 ? Number(Math.min(100, (total / cap) * 100).toFixed(2)) : 0,
        };
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}