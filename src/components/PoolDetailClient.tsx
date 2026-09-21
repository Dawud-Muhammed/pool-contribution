"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PoolProgressBar from "@/components/PoolProgressBar";
import PublicLedgerTable from "@/components/PublicLedgerTable";

type LedgerData = { pool: { id: string; name: string; capAmount: string; currency: string; status: string; totalAllocated: string; progressPercentage: number }; entries: { id: string; pseudonym: string; type: string; amount: string; createdAt: string }[] };

export default function PoolDetailClient({ poolId }: { poolId: string }) {
  const [data, setData] = useState<LedgerData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { fetch(`/api/pools/${poolId}/ledger`).then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setData(result); }).catch((reason) => setError(reason.message)); }, [poolId]);

  if (error) return <main className="shell"><div className="error-panel"><h1>Pool unavailable</h1><p>{error}</p></div></main>;
  if (!data) return <main className="shell"><div className="loading-line">Loading pool ledger...</div></main>;

  return <main className="shell page-space"><div className="detail-heading"><div><Link className="back-link" href="/pools">← All pools</Link><span className="eyebrow">Public pool dashboard</span><h1>{data.pool.name}</h1><p className="lede">A transparent view of the pool, with contributor identities kept private.</p></div><span className={`status-badge ${data.pool.status}`}>{data.pool.status}</span></div>
    <section className="hero-panel"><div className="hero-panel-top"><div><span className="eyebrow">Current progress</span><div className="big-number">{Number(data.pool.totalAllocated).toLocaleString()} <small>{data.pool.currency}</small></div></div><div className="percentage">{data.pool.progressPercentage.toFixed(0)}<small>%</small></div></div><PoolProgressBar total={data.pool.totalAllocated} cap={data.pool.capAmount} currency={data.pool.currency} showValues={false} /><div className="hero-foot"><span>Target cap</span><strong>{Number(data.pool.capAmount).toLocaleString()} {data.pool.currency}</strong></div></section>
    <div className="section-heading"><div><span className="eyebrow">Append-only history</span><h2>Public ledger</h2></div><a className="button primary" href={`/deposit?pool=${poolId}`}>Submit a receipt</a></div><PublicLedgerTable entries={data.entries} />
  </main>;
}