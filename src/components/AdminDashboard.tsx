"use client";

import { useEffect, useState } from "react";
import AdminActionModal from "@/components/AdminActionModal";
import PoolProgressBar from "@/components/PoolProgressBar";

type Row = { contributionId: string; allocatedAmount: string; contributionStatus: string; providerKey: string; receiptRef: string; depositStatus: string; payerName: string | null; createdAt: string; pseudonym: string | null };
type AdminData = { pool: { id: string; name: string; capAmount: string; currency: string; status: string }; contributions: Row[] };

export default function AdminDashboard({ poolId }: { poolId: string }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [action, setAction] = useState<{ type: "refund" | "waive"; id: string } | null>(null);

  async function load() { const response = await fetch(`/api/admin/pools/${poolId}`); const result = await response.json(); if (!response.ok) throw new Error(result.error); setData(result); }
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/pools/${poolId}`).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!cancelled) setData(result);
    }).catch((reason) => { if (!cancelled) setError(reason.message); });
    return () => { cancelled = true; };
  }, [poolId]);
  if (error) return <main className="shell"><div className="error-panel"><h1>Admin access required</h1><p>{error}</p></div></main>;
  if (!data) return <main className="shell"><div className="loading-line">Loading private pool view...</div></main>;
  const total = data.contributions.reduce((sum, row) => sum + Number(row.allocatedAmount), 0);

  return <main className="shell page-space"><div className="detail-heading"><div><span className="eyebrow">Restricted workspace</span><h1>{data.pool.name}</h1><p className="lede">Private receipt details and ledger-safe actions for administrators.</p></div><span className="status-badge admin">Admin</span></div><section className="hero-panel compact"><div className="hero-panel-top"><div><span className="eyebrow">Allocated</span><div className="big-number">{total.toLocaleString()} <small>{data.pool.currency}</small></div></div><span className={`status-badge ${data.pool.status}`}>{data.pool.status}</span></div><PoolProgressBar total={total} cap={data.pool.capAmount} currency={data.pool.currency} /></section><div className="section-heading"><div><span className="eyebrow">Private contribution queue</span><h2>{data.contributions.length} contributions</h2></div></div><div className="table-scroll"><table className="ledger-table admin-table"><thead><tr><th>Payer</th><th>Receipt</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.contributions.map((row) => <tr key={row.contributionId}><td><strong>{row.payerName || "Name unavailable"}</strong><small className="table-subtext">{row.pseudonym || "No pseudonym"}</small></td><td><span className="receipt-ref">{row.providerKey} · {row.receiptRef}</span></td><td className="amount">{Number(row.allocatedAmount).toLocaleString()} ETB</td><td><span className={`event-tag ${row.contributionStatus}`}>{row.contributionStatus}</span></td><td><div className="row-actions"><button className="text-button" disabled={row.contributionStatus === "refunded"} onClick={() => setAction({ type: "refund", id: row.contributionId })}>Refund</button><button className="text-button" disabled={row.contributionStatus === "waived"} onClick={() => setAction({ type: "waive", id: row.contributionId })}>Waive</button></div></td></tr>)}</tbody></table></div>{action && <AdminActionModal poolId={poolId} contributionId={action.id} action={action.type} onClose={() => setAction(null)} onComplete={() => { setAction(null); load().catch((reason) => setError(reason.message)); }} />}</main>;
}