"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Pool = { id: string; name: string; purpose: string; beneficiary: string; paymentProvider: string | null; paymentAccount: string | null; capAmount: string; currency: string; status: string; totalAllocated: string };

const emptyForm = { name: "", purpose: "", beneficiary: "", capAmount: "", currency: "ETB", paymentProvider: "Telebirr", paymentAccount: "", paymentInstructions: "Send your contribution to this account, then submit the receipt reference below." };

export default function AdminPoolsClient() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadPools() {
    const response = await fetch("/api/admin/pools");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load pools.");
    setPools(result.pools);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/pools").then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load pools.");
      if (!cancelled) setPools(result.pools);
    }).catch((reason) => { if (!cancelled) setError(reason.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const response = await fetch("/api/admin/pools", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create pool.");
      setForm(emptyForm);
      setSaved(`Pool created. Public link: /pools/${result.pool.id}`);
      await loadPools();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create pool.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="shell page-space"><div className="page-heading"><div><span className="eyebrow">Admin workspace</span><h1>Create a pool.</h1><p className="lede">Define the real-world goal and the exact account contributors should pay before submitting their receipt.</p></div><span className="status-badge admin">Private</span></div><div className="admin-create-grid"><section className="form-panel"><form className="form-stack" onSubmit={submit}><span className="eyebrow">Pool details</span><label>Pool name<input required value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Community Solar Fund" /></label><label>Purpose<textarea required value={form.purpose} onChange={(event) => updateField("purpose", event.target.value)} placeholder="What will this pool fund?" /></label><label>Beneficiary<input required value={form.beneficiary} onChange={(event) => updateField("beneficiary", event.target.value)} placeholder="Who receives the outcome?" /></label><div className="field-grid"><label>Target cap<input required type="number" min="0.01" step="0.01" value={form.capAmount} onChange={(event) => updateField("capAmount", event.target.value)} placeholder="100000" /></label><label>Currency<select value={form.currency} onChange={(event) => updateField("currency", event.target.value)}><option>ETB</option><option>USD</option></select></label></div><span className="eyebrow form-section-label">Payment destination</span><div className="field-grid"><label>Provider<input required value={form.paymentProvider} onChange={(event) => updateField("paymentProvider", event.target.value)} placeholder="Telebirr or CBE" /></label><label>Account or phone number<input required value={form.paymentAccount} onChange={(event) => updateField("paymentAccount", event.target.value)} placeholder="09XXXXXXXX" /></label></div><label>Contributor instructions<textarea required value={form.paymentInstructions} onChange={(event) => updateField("paymentInstructions", event.target.value)} /></label>{error && <div className="form-result error" role="alert">{error}</div>}{saved && <div className="form-result success" role="status">{saved}</div>}<button className="button primary" type="submit" disabled={saving}>{saving ? "Creating pool..." : "Create pool"}</button></form></section><section className="admin-list-panel"><div className="section-heading"><div><span className="eyebrow">Existing pools</span><h2>{pools.length} pools</h2></div></div>{loading ? <div className="loading-line">Loading pools...</div> : pools.length === 0 ? <div className="empty-state">No pools created yet.</div> : <div className="admin-pool-list">{pools.map((pool) => <Link className="admin-pool-row" href={`/admin/pools/${pool.id}`} key={pool.id}><div><strong>{pool.name}</strong><span>{pool.paymentProvider} · {pool.paymentAccount}</span></div><div><span className={`status-badge ${pool.status}`}>{pool.status}</span><small>{Number(pool.totalAllocated).toLocaleString()} / {Number(pool.capAmount).toLocaleString()} {pool.currency}</small></div></Link>)}</div>}</section></div></main>;
}