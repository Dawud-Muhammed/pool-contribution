"use client";

import { FormEvent, useState } from "react";

type DepositFormProps = { poolId?: string };

export default function DepositForm({ poolId }: DepositFormProps) {
  const [providerKey, setProviderKey] = useState("telebirr");
  const [receiptRef, setReceiptRef] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [depositId, setDepositId] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ providerKey, receiptRef }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification could not be completed.");
      setDepositId(data.deposit.id);
      setStatus("success");
      setMessage(`Verified for ${Number(data.deposit.verifiedAmount).toLocaleString()} ETB.`);
      setReceiptRef("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Verification failed.");
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <div className="field-grid">
        <label>Provider<select value={providerKey} onChange={(event) => setProviderKey(event.target.value)}>
          <option value="telebirr">Telebirr</option><option value="cbe">CBE</option><option value="cbebirr">CBE Birr</option><option value="awash">Awash</option>
        </select></label>
        <label>Receipt reference or URL<input required value={receiptRef} onChange={(event) => setReceiptRef(event.target.value)} placeholder={providerKey === "telebirr" ? "e.g. TXN-48291" : "Paste the receipt URL"} /></label>
      </div>
      <p className="field-note">We verify against the provider source. Your receipt and payer name stay private.</p>
      <button className="button primary" type="submit" disabled={status === "loading"}>{status === "loading" ? "Checking receipt..." : "Verify receipt"}</button>
      {status !== "idle" && <div className={`form-result ${status}`} role="status"><strong>{status === "success" ? "Receipt verified" : status === "error" ? "Verification needs attention" : ""}</strong><span>{message}</span>{depositId && <small>Deposit ID: {depositId}{poolId ? ` · Allocate it from the ${poolId} pool dashboard.` : ""}</small>}</div>}
    </form>
  );
}