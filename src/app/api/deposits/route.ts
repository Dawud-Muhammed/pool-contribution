import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deposits, pools, receiptsPrivate, user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  verifyReceipt,
  parseReceiptAmount,
} from "@/lib/links-et";
import { auth } from "@/lib/auth";
import {
  extractReceiverAccount,
  isReceiverAccountMatch,
} from "@/lib/verifyReceiver";

export async function POST(req: NextRequest) {
  try {
    const idempotencyKey =
      req.headers.get("Idempotency-Key") ||
      req.headers.get("idempotency-key") ||
      crypto.randomUUID();

    const body = await req.json();
    const { providerKey, receiptRef, url, reference, waitMs, poolId } = body;

    if (!providerKey || (!receiptRef && !reference && !url)) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: providerKey and one of receiptRef, reference, or url.",
        },
        { status: 400 }
      );
    }

    const ref = receiptRef || reference || url;

    // Check user authentication
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    let userId = session?.user?.id;

    // Fallback: If no authenticated session during local dev/testing, find or create anonymous user
    if (!userId) {
      const devEmail = "guest@poolapp.local";
      const existingUser = await db.query.user.findFirst({
        where: eq(user.email, devEmail),
      });

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const [newUser] = await db
          .insert(user)
          .values({
            id: crypto.randomUUID(),
            name: "Guest Contributor",
            email: devEmail,
            emailVerified: true,
          })
          .returning();
        userId = newUser.id;
      }
    }

    // Invariant §3.3: A receipt can be applied to at most one contribution, ever.
    const existing = await db.query.deposits.findFirst({
      where: and(
        eq(deposits.providerKey, providerKey),
        eq(deposits.receiptRef, ref)
      ),
    });

    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: "Receipt already used.",
          depositId: existing.id,
          status: existing.status,
        },
        { status: 409 }
      );
    }

    // Call links.et verification
    const verificationResult = await verifyReceipt(
      {
        url: url || (providerKey !== "telebirr" ? ref : undefined),
        reference: reference || (providerKey === "telebirr" ? ref : undefined),
        waitMs: waitMs ?? 2000,
      },
      `deposit:${idempotencyKey}`
    );

    if (!verificationResult.ok) {
      // Record failed or verifying attempt for audit
      const [failedDeposit] = await db
        .insert(deposits)
        .values({
          id: crypto.randomUUID(),
          userId,
          providerKey,
          receiptRef: ref,
          status: "failed",
        })
        .returning();

      return NextResponse.json(
        {
          ok: false,
          depositId: failedDeposit.id,
          error: verificationResult.error,
        },
        { status: 400 }
      );
    }

    const receipt = verificationResult.receipt;
    const verifiedAmount = parseReceiptAmount(
      receipt.source,
      receipt.amount
    );

    // SECURITY: Verify the payment was sent to the correct account (PRD §6 destination mismatch)
    if (poolId) {
      const pool = await db.query.pools.findFirst({
        where: eq(pools.id, poolId),
        columns: { id: true, paymentDestinations: true },
      });

      if (pool) {
        const destinations = pool.paymentDestinations as Array<{
          label: string;
          value: string;
        }>;
        const receiverAccount = extractReceiverAccount(
          receipt as Record<string, unknown>
        );

        if (receiverAccount && destinations.length > 0) {
          if (!isReceiverAccountMatch(receiverAccount, destinations)) {
            // Record the failed deposit for audit trail
            const [fraudDeposit] = await db
              .insert(deposits)
              .values({
                id: crypto.randomUUID(),
                userId,
                providerKey,
                receiptRef: ref,
                status: "failed",
              })
              .returning();

            // Store the receipt privately for admin investigation
            await db.insert(receiptsPrivate).values({
              id: crypto.randomUUID(),
              depositId: fraudDeposit.id,
              rawReceiptJson: receipt,
              payerName: receipt.payerName || null,
              fetchedAt: new Date(
                verificationResult.fetchedAt || Date.now()
              ),
            });

            return NextResponse.json(
              {
                ok: false,
                depositId: fraudDeposit.id,
                error:
                  "Receipt is valid but was not paid to an account associated with this pool. " +
                  "The receiver account on the receipt does not match any listed payment destination. " +
                  "This deposit has been rejected and flagged for review.",
              },
              { status: 403 }
            );
          }
        }
      }
    }

    const depositId = crypto.randomUUID();

    // Store deposit and sensitive receipt in admin-only table receipts_private
    const [savedDeposit] = await db
      .insert(deposits)
      .values({
        id: depositId,
        userId,
        providerKey,
        receiptRef: ref,
        verifiedAmount: verifiedAmount ? verifiedAmount.toString() : null,
        status: "verified",
        linksEtRequestId: verificationResult.providerKey,
        verifiedAt: new Date(verificationResult.fetchedAt || Date.now()),
      })
      .returning();

    // Invariant §3.4 / §11: Raw receipt JSON and bank payer name go to receipts_private
    await db.insert(receiptsPrivate).values({
      id: crypto.randomUUID(),
      depositId: savedDeposit.id,
      rawReceiptJson: receipt,
      payerName: receipt.payerName || null,
      fetchedAt: new Date(verificationResult.fetchedAt || Date.now()),
    });

    // Return safe public-safe fields only
    return NextResponse.json(
      {
        ok: true,
        deposit: {
          id: savedDeposit.id,
          providerKey: savedDeposit.providerKey,
          verifiedAmount: savedDeposit.verifiedAmount,
          status: savedDeposit.status,
          verifiedAt: savedDeposit.verifiedAt,
          createdAt: savedDeposit.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
