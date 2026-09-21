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
    const { contributionId } = await req.json();

    if (!contributionId) {
      return NextResponse.json({ error: "Missing contributionId" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
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
        throw new Error("Contribution not found");
      }

      if (contribution.status === "waived") {
        throw new Error("Contribution is already waived");
      }

      const [updatedContribution] = await tx
        .update(contributions)
        .set({ status: "waived" })
        .where(eq(contributions.id, contributionId))
        .returning();

      const [originalLedgerEntry] = await tx
        .select({ pseudonym: ledgerEntries.pseudonym, amount: ledgerEntries.amount })
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.contributionId, contributionId),
            eq(ledgerEntries.type, "contribution")
          )
        );

      await tx.insert(ledgerEntries).values({
        poolId,
        contributionId,
        pseudonym: originalLedgerEntry?.pseudonym || "Unknown",
        type: "waiver",
        amount: originalLedgerEntry?.amount || "0",
      });

      return updatedContribution;
    });

    return NextResponse.json({ ok: true, waiver: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}