import "server-only";

const LINKS_ET_BASE = "https://links.et";

export interface VerifyReceiptBody {
  url?: string;
  reference?: string;
  waitMs?: number;
}

export interface VerifyImageBody {
  images: Array<{
    imageBase64: string;
  }>;
}

export interface LinksEtError {
  code?: string;
  message: string;
}

export interface LinksEtSuccessResponse {
  ok: true;
  providerKey: string;
  resolvedUrl?: string;
  httpStatus: number;
  fetchedAt: string;
  receipt: {
    source: string;
    amount?: number | string;
    payerName?: string;
    reference?: string;
    [key: string]: unknown;
  };
}

export interface LinksEtErrorResponse {
  ok: false;
  error: LinksEtError;
}

export type LinksEtVerifyResult = LinksEtSuccessResponse | LinksEtErrorResponse;

/**
 * Verify a receipt at the source via links.et.
 * Server-only: LINKS_ET_API_KEY is never exposed to the client.
 */
export async function verifyReceipt(
  body: VerifyReceiptBody,
  idempotencyKey: string
): Promise<LinksEtVerifyResult> {
  const apiKey = process.env.LINKS_ET_API_KEY;
  if (!apiKey) {
    throw new Error("Missing LINKS_ET_API_KEY environment variable");
  }

  const res = await fetch(`${LINKS_ET_BASE}/api/verify`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

/**
 * Verify from a screenshot via links.et (/api/verify-image).
 */
export async function verifyReceiptImage(
  body: VerifyImageBody,
  idempotencyKey: string
): Promise<LinksEtVerifyResult> {
  const apiKey = process.env.LINKS_ET_API_KEY;
  if (!apiKey) {
    throw new Error("Missing LINKS_ET_API_KEY environment variable");
  }

  const res = await fetch(`${LINKS_ET_BASE}/api/verify-image`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

/**
 * Health check to distinguish bank outage from integration failure.
 */
export async function getLinksEtStatus(): Promise<{
  ok: boolean;
  status?: unknown;
}> {
  const res = await fetch(`${LINKS_ET_BASE}/api/status`, {
    method: "GET",
  });
  return res.json();
}

/**
 * Parse amount from raw receipt based on provider source.
 * CBE/Zemen/BoA return numbers; telebirr returns "100 Birr"; Awash returns "100 ETB".
 */
export function parseReceiptAmount(
  source: string,
  rawAmount: unknown,
  receipt?: Record<string, unknown>
): number | null {
  let valToParse = rawAmount;

  // Handle awash-html which nests the amount under transaction
  if (source === "awash-html" && receipt?.transaction && typeof receipt.transaction === "object") {
    valToParse = (receipt.transaction as Record<string, unknown>).amount ?? rawAmount;
  }

  if (typeof valToParse === "number") {
    return isNaN(valToParse) ? null : valToParse;
  }
  if (typeof valToParse === "string") {
    // Remove commas, currency symbols, and extra whitespace
    const cleaned = valToParse
      .replace(/,/g, "")
      .replace(/[^\d.]/g, "")
      .trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}
