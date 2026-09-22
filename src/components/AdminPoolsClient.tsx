"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Pool = { id: string; name: string; purpose: string; beneficiary: string; paymentDestinations: { label: string; value: string }[]; capAmount: string; currency: string; status: string; totalAllocated: string };
type Destination = { label: string; value: string };

const emptyForm = { name: "", purpose: "", beneficiary: "", capAmount: "", currency: "ETB", paymentDestinations: [{ label: "CBE", value: "" }] as Destination[], paymentInstructions: "Send your contribution to one of the accounts above, then submit the receipt reference below." };

export default function AdminPoolsClient() {
  const router = useRouter();
  const [pools, setPools] = useState<Pool[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadPools() {
    const response = await fetch("/api/admin/pools");
    const text = await response.text();
    let result: { error?: string; pools?: Pool[] };
    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Server returned an invalid response (${response.status}).`);
    }
    if (!response.ok) throw new Error(result.error || "Unable to load pools.");
    setPools(result.pools || []);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/pools").then(async (response) => {
      const text = await response.text();
      let result: { error?: string; pools?: Pool[] };
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Server returned an invalid response (${response.status}).`);
      }
      if (!response.ok) throw new Error(result.error || "Unable to load pools.");
      if (!cancelled) setPools(result.pools || []);
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load pools."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function updateField(field: "name" | "purpose" | "beneficiary" | "capAmount" | "currency" | "paymentInstructions", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateDestination(index: number, field: keyof Destination, value: string) {
    setForm((current) => ({ ...current, paymentDestinations: current.paymentDestinations.map((destination, destinationIndex) => destinationIndex === index ? { ...destination, [field]: value } : destination) }));
  }

  function addDestination() { setForm((current) => ({ ...current, paymentDestinations: [...current.paymentDestinations, { label: "", value: "" }] })); }
  function removeDestination(index: number) { setForm((current) => ({ ...current, paymentDestinations: current.paymentDestinations.filter((_, destinationIndex) => destinationIndex !== index) })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const response = await fetch("/api/admin/pools", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const responseText = await response.text();
      let result: { error?: string; pool?: { id: string } } = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(`Pool API returned an invalid response (${response.status}). Check the Vercel function logs.`);
      }
      if (!response.ok) throw new Error(result.error || "Could not create pool.");
      if (!result.pool) throw new Error("Pool was not returned by the server.");
      setForm(emptyForm);
      setSaved(`Pool created. Public link: /pools/${result.pool.id}`);
      await loadPools();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create pool.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="shell page-space"><div className="page-heading"><div><span className="eyebrow">Admin workspace</span><h1>Create a pool.</h1><p className="lede">Define the real-world goal and every account contributors can use before submitting a receipt.</p></div><div className="admin-toolbar"><span className="status-badge admin">Private</span><Link className="quiet-link" href="/admin/profile">Profile</Link><button className="text-button" type="button" onClick={async () => { await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); router.push("/admin/login"); }}>Log out</button></div></div><div className="admin-create-grid"><section className="form-panel"><form className="form-stack" onSubmit={submit}><span className="eyebrow">Pool details</span><label>Pool name<input required value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Community Solar Fund" /></label><label>Purpose<textarea required value={form.purpose} onChange={(event) => updateField("purpose", event.target.value)} placeholder="What will this pool fund?" /></label><label>Beneficiary<input required value={form.beneficiary} onChange={(event) => updateField("beneficiary", event.target.value)} placeholder="Who receives the outcome?" /></label><div className="field-grid"><label>Target cap<input required type="number" min="0.01" step="0.01" value={form.capAmount} onChange={(event) => updateField("capAmount", event.target.value)} placeholder="100000" /></label><label>Currency<select value={form.currency} onChange={(event) => updateField("currency", event.target.value)}><option>ETB</option><option>USD</option></select></label></div><span className="eyebrow form-section-label">Payment destinations</span><div className="destination-list">{form.paymentDestinations.map((destination, index) => <div className="destination-row" key={index}><input required aria-label={`Payment label ${index + 1}`} value={destination.label} onChange={(event) => updateDestination(index, "label", event.target.value)} placeholder="CBE" /><input required aria-label={`Payment account ${index + 1}`} value={destination.value} onChange={(event) => updateDestination(index, "value", event.target.value)} placeholder="Account or phone number" />{form.paymentDestinations.length > 1 && <button className="icon-button" type="button" onClick={() => removeDestination(index)} aria-label="Remove payment destination">×</button>}</div>)}</div><button className="quiet-link add-destination" type="button" onClick={addDestination}>+ Add another account</button><label>Contributor instructions<textarea required value={form.paymentInstructions} onChange={(event) => updateField("paymentInstructions", event.target.value)} /></label>{error && <div className="form-result error" role="alert">{error}</div>}{saved && <div className="form-result success" role="status">{saved}</div>}<button className="button primary" type="submit" disabled={saving}>{saving ? "Creating pool..." : "Create pool"}</button></form></section><section className="admin-list-panel"><div className="section-heading"><div><span className="eyebrow">Existing pools</span><h2>{pools.length} pools</h2></div></div>{loading ? <div className="loading-line">Loading pools...</div> : pools.length === 0 ? <div className="empty-state">No pools created yet.</div> : <div className="admin-pool-list">{pools.map((pool) => <Link className="admin-pool-row" href={`/admin/pools/${pool.id}`} key={pool.id}><div><strong>{pool.name}</strong><span>{pool.paymentDestinations?.map((destination) => `${destination.label} · ${destination.value}`).join(" / ")}</span></div><div><span className={`status-badge ${pool.status}`}>{pool.status}</span><small>{Number(pool.totalAllocated).toLocaleString()} / {Number(pool.capAmount).toLocaleString()} {pool.currency}</small></div></Link>)}</div>}</section></div></main>;
}