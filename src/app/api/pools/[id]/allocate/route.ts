import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pools, deposits, contributions, ledgerEntries } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generatePseudonym } from "@/lib/pseudonym";
import { isAdmin } from "@/lib/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { id: poolId } = await params;
    const body = await req.json();
    const { depositId, amount } = body;

    if (!depositId) {
      return NextResponse.json(
        { error: "Missing required field: depositId" },
        { status: 400 }
      );
    }

    // 1. Fetch deposit
    const deposit = await db.query.deposits.findFirst({
      where: eq(deposits.id, depositId),
    });

    if (!deposit) {
      return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
    }

    if (deposit.status !== "verified") {
      return NextResponse.json(
        { error: `Deposit status is ${deposit.status}. Only verified deposits can be allocated.` },
        { status: 400 }
      );
    }

    const allocateAmount = amount ? Number(amount) : Number(deposit.verifiedAmount);
    if (!allocateAmount || allocateAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid allocation amount" },
        { status: 400 }
      );
    }

    // 2. Concurrency-safe atomic allocation within a transaction
    const result = await db.transaction(async (tx) => {
      // Row lock the pool to prevent race conditions (PRD §3.1 / §12)
      const [pool] = await tx
        .select()
        .from(pools)
        .where(eq(pools.id, poolId))
        .for("update");

      if (!pool) {
        throw new Error("POOL_NOT_FOUND");
      }

      if (pool.status !== "open") {
        throw new Error("POOL_NOT_OPEN");
      }

      // Calculate current total allocated for this pool
      const [totalRow] = await tx
        .select({
          total: sql<string>`coalesce(sum(${contributions.allocatedAmount}), 0)`,
        })
        .from(contributions)
        .where(eq(contributions.poolId, poolId));

      const currentTotal = parseFloat(totalRow.total || "0");
      const cap = parseFloat(pool.capAmount);

      if (currentTotal + allocateAmount > cap) {
        throw new Error("CAP_EXCEEDED");
      }

      // Record contribution
      const [newContribution] = await tx
        .insert(contributions)
        .values({
          id: crypto.randomUUID(),
          depositId: deposit.id,
          poolId: pool.id,
          allocatedAmount: allocateAmount.toFixed(2),
          status: "allocated",
        })
        .returning();

      // Non-reversible pseudonym for public ledger
      const pseudonym = generatePseudonym(deposit.userId);

      // Invariant §3.5: Append-only ledger entry
      const [ledgerEntry] = await tx
        .insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          poolId: pool.id,
          contributionId: newContribution.id,
          pseudonym,
          type: "contribution",
          amount: allocateAmount.toFixed(2),
        })
        .returning();

      const newTotal = currentTotal + allocateAmount;
      if (newTotal >= cap) {
        await tx
          .update(pools)
          .set({ status: "capped" })
          .where(eq(pools.id, poolId));
      }

      return {
        contribution: newContribution,
        ledgerEntry,
        poolStatus: newTotal >= cap ? "capped" : "open",
        currentTotal: newTotal,
        capAmount: cap,
      };
    });

    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "POOL_NOT_FOUND") {
        return NextResponse.json({ error: "Pool not found" }, { status: 404 });
      }
      if (err.message === "POOL_NOT_OPEN") {
        return NextResponse.json({ error: "Pool is not open for contributions" }, { status: 400 });
      }
      if (err.message === "CAP_EXCEEDED") {
        return NextResponse.json(
          { error: "Allocation would exceed pool cap (Invariant §3.1)" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
