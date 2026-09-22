"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";

type PaymentDestination = { label: string; value: string };
type DepositFormProps = { poolId?: string };

const ALL_PROVIDERS = [
  { value: "telebirr", label: "Telebirr" },
  { value: "cbe", label: "CBE" },
  { value: "cbebirr", label: "CBE Birr" },
  { value: "awash", label: "Awash" },
];

export default function DepositForm({ poolId }: DepositFormProps) {
  const [providerKey, setProviderKey] = useState("telebirr");
  const [receiptRef, setReceiptRef] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [depositId, setDepositId] = useState("");
  const [poolContext, setPoolContext] = useState<{ name: string; paymentDestinations: PaymentDestination[]; paymentInstructions: string } | null>(null);

  useEffect(() => {
    if (!poolId) return;
    fetch(`/api/pools/${poolId}/ledger`).then((response) => response.json()).then((result) => { if (result.pool) setPoolContext(result.pool); }).catch(() => undefined);
  }, [poolId]);

  const displayProviders = useMemo(() => {
    if (!poolContext || !poolContext.paymentDestinations) return ALL_PROVIDERS;
    const available = ALL_PROVIDERS.filter(p => {
      return poolContext.paymentDestinations.some(d => {
        const l = d.label.toLowerCase();
        if (p.value === 'cbebirr') return l.includes('cbe birr') || l.includes('cbebirr');
        if (p.value === 'cbe') return l.includes('cbe') && !l.includes('birr');
        return l.includes(p.value);
      });
    });
    return available.length > 0 ? available : ALL_PROVIDERS;
  }, [poolContext]);

  const selectedProvider = displayProviders.some(p => p.value === providerKey)
    ? providerKey
    : (displayProviders[0]?.value || "telebirr");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ providerKey: selectedProvider, receiptRef, poolId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification could not be completed.");
      setDepositId(data.deposit.id);
      setStatus("success");
      setMessage(`Verified for ${Number(data.deposit.verifiedAmount).toLocaleString()} ETB.`);
      setReceiptRef("");
    } catch (error) {
      setStatus("error");
      const errMsg = error instanceof Error ? error.message : "Verification failed.";
      setMessage(
        errMsg === "Failed to fetch" 
          ? "Network connection failed. Please check your connection or make sure the server is running." 
          : errMsg
      );
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      {poolContext && <div className="payment-instructions"><span className="eyebrow">Paying into {poolContext.name}</span>{poolContext.paymentDestinations.map((destination) => <strong key={`${destination.label}-${destination.value}`}>{destination.label} · {destination.value}</strong>)}<p>{poolContext.paymentInstructions}</p></div>}
      <div className="field-grid">
        <label>Payment service<select value={selectedProvider} onChange={(event) => setProviderKey(event.target.value)}>
          {displayProviders.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select></label>
        <label>Receipt number or link<input required value={receiptRef} onChange={(event) => setReceiptRef(event.target.value.toUpperCase())} placeholder={selectedProvider === "telebirr" ? "Example: TXN-48291" : "Paste the receipt link"} /></label>
      </div>
      <p className="field-note">We check the payment directly with the provider. Your receipt and name stay private.</p>
      <button className="button primary" type="submit" disabled={status === "loading"}>{status === "loading" ? "Checking receipt..." : "Verify receipt"}</button>
      {status !== "idle" && <div className={`form-result ${status}`} role="status"><strong>{status === "success" ? "Receipt verified" : status === "error" ? "Verification needs attention" : ""}</strong><span>{message}</span>{depositId && <small>Deposit ID: {depositId}{poolId ? ` · Allocate it from the ${poolId} pool dashboard.` : ""}</small>}</div>}
    </form>
  );
}