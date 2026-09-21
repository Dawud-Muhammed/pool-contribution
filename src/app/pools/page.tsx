"use client";

import { useEffect, useState } from "react";
import PoolProgressBar from "@/components/PoolProgressBar";

type Pool = { id: string; name: string; purpose: string; capAmount: string; currency: string; status: string; totalAllocated: string; progressPercentage: number };

export default function PoolsPage() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/pools").then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setPools(result.pools); }).catch((reason) => setError(reason.message)); }, []);
  return <main className="shell page-space"><div className="page-heading"><div><span className="eyebrow">Community pools</span><h1>Fund something together.</h1><p className="lede">Choose a shared target, follow the public ledger, and contribute when you are ready.</p></div><a className="button primary" href="/deposit">Verify a receipt</a></div>{error && <div className="error-panel">{error}</div>}{!pools.length && !error ? <div className="empty-state large">No pools are open yet.</div> : <div className="pool-grid">{pools.map((pool) => <a className="pool-card" href={`/pools/${pool.id}`} key={pool.id}><div className="pool-card-top"><span className={`status-badge ${pool.status}`}>{pool.status}</span><span className="card-arrow">↗</span></div><h2>{pool.name}</h2><p className="pool-purpose">{pool.purpose || "A shared community goal with transparent progress."}</p><PoolProgressBar total={pool.totalAllocated} cap={pool.capAmount} currency={pool.currency} /><div className="card-meta"><span>{pool.progressPercentage.toFixed(0)}% funded</span><strong>{Number(pool.capAmount).toLocaleString()} {pool.currency} cap</strong></div></a>)}</div>}</main>;
}