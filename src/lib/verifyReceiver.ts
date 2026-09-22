import "server-only";

/**
 * Extracts the receiver/beneficiary account number from a links.et receipt
 * based on the receipt source type.
 *
 * Each bank/provider embeds the receiver account under a different field name.
 * This function normalises that into a single string for comparison against
 * the pool's expected payment destinations.
 *
 * Returns the account number string, or null if the source is unsupported
 * or the field is missing.
 */
export function extractReceiverAccount(
  receipt: Record<string, unknown>
): string | null {
  const source = receipt.source as string | undefined;
  if (!source) return null;

  switch (source) {
    case "telebirr-html": {
      const value = receipt.creditedPartyAccountNo;
      return typeof value === "string" ? value.trim() : null;
    }

    case "cbe-pdf":
    case "mb-json":
    case "boa-json": {
      const value = receipt.receiverAccount;
      return typeof value === "string" ? value.trim() : null;
    }

    case "zemen-pdf": {
      const value = receipt.recipientAccount;
      return typeof value === "string" ? value.trim() : null;
    }

    case "awash-html": {
      const transaction = receipt.transaction;
      if (
        typeof transaction === "object" &&
        transaction !== null &&
        "beneficiaryAccount" in transaction
      ) {
        const value = (transaction as Record<string, unknown>)
          .beneficiaryAccount;
        return typeof value === "string" ? value.trim() : null;
      }
      return null;
    }

    default:
      // Source type not in our mapping — cannot extract receiver
      return null;
  }
}

/**
 * Checks whether the receiver account from a verified receipt matches
 * any of the pool's listed payment destinations.
 *
 * @param receiverAccount - The account extracted from the receipt
 * @param paymentDestinations - The pool's payment destinations array
 * @returns true if the receiver account matches at least one destination
 */
export function isReceiverAccountMatch(
  receiverAccount: string,
  paymentDestinations: Array<{ label: string; value: string }>
): boolean {
  if (!receiverAccount || !paymentDestinations?.length) return false;

  const normalised = receiverAccount.replace(/[\s-]/g, "");

  return paymentDestinations.some((dest) => {
    const destNormalised = dest.value.replace(/[\s-]/g, "");
    return destNormalised === normalised;
  });
}
