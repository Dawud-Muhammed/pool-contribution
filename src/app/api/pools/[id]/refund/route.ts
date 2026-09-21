import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contributions, ledgerEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poolId } = await params;
    const { contributionId, refundAmount } = await req.json();

    if (!contributionId || !refundAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const requestedRefund = Number(refundAmount);

    const result = await db.transaction(async (tx) => {
      // Step A: Lock the contribution row
      const [contribution] = await tx
        .select()
        .from(contributions)
        .where(
          and(
            eq(contributions.id, contributionId),
            eq(contributions.poolId, poolId)
          )
        )
        .for("update");

      if (!contribution) {
        throw new Error("Contribution not found in this pool");
      }

      if (contribution.status === "refunded") {
        throw new Error("Contribution is already refunded");
      }

      const allocated = Number(contribution.allocatedAmount);
      if (requestedRefund > allocated) {
        throw new Error("Cannot refund more than the allocated amount");
      }

      // Step B: Update contribution status
      const [updatedContribution] = await tx
        .update(contributions)
        .set({ status: "refunded" })
        .where(eq(contributions.id, contributionId))
        .returning();

      // Step C: Find original pseudonym to maintain ledger history
      const [originalLedgerEntry] = await tx
        .select({ pseudonym: ledgerEntries.pseudonym })
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.contributionId, contributionId),
            eq(ledgerEntries.type, "contribution")
          )
        );

      // Step D: Append offsetting refund entry (Invariant §3.5)
      await tx.insert(ledgerEntries).values({
        poolId,
        contributionId,
        pseudonym: originalLedgerEntry?.pseudonym || "Unknown",
        type: "refund",
        amount: requestedRefund.toString(),
      });

      return updatedContribution;
    });

    return NextResponse.json({ ok: true, refund: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}