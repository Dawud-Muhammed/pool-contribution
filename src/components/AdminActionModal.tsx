"use client";

import { FormEvent, useState } from "react";

type AdminActionModalProps = {
  poolId: string;
  contributionId: string;
  action: "refund" | "waive";
  onClose: () => void;
  onComplete: () => void;
};

export default function AdminActionModal({ poolId, contributionId, action, onClose, onComplete }: AdminActionModalProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const body = action === "refund" ? { contributionId, refundAmount: amount } : { contributionId };
    const response = await fetch(`/api/pools/${poolId}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Action failed."); setLoading(false); return; }
    onComplete();
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="action-title">
      <div className="modal-heading"><div><span className="eyebrow">Admin action</span><h2 id="action-title">{action === "refund" ? "Refund contribution" : "Waive contribution"}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
      <p className="muted">This will append a new {action} entry to the public ledger. Existing history is never edited.</p>
      <form className="form-stack" onSubmit={submit}>
        {action === "refund" && <label>Refund amount (ETB)<input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>}
        {error && <div className="form-result error">{error}</div>}
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button primary" disabled={loading}>{loading ? "Saving..." : `Confirm ${action}`}</button></div>
      </form>
    </div>
  </div>;
}