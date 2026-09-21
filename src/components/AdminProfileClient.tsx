"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminProfileClient() {
  const [profile, setProfile] = useState<{ name: string; email: string; role: string } | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => { let cancelled = false; fetch("/api/admin/profile").then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); if (!cancelled) { setProfile(result.profile); setName(result.profile.name); } }).catch((reason) => { if (!cancelled) setError(reason.message); }); return () => { cancelled = true; }; }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Could not save profile."); return; }
    setProfile(result.profile);
    setMessage("Profile updated.");
  }

  async function logout() { await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); router.push("/admin/login"); }

  if (error) return <main className="shell page-space"><div className="error-panel"><h1>Admin access required</h1><p>{error}</p><Link className="button primary" href="/admin/login">Go to sign in</Link></div></main>;
  if (!profile) return <main className="shell page-space"><div className="loading-line">Loading profile...</div></main>;
  return <main className="shell page-space narrow-page"><div className="page-heading"><div><Link className="back-link" href="/admin/pools">← Admin pools</Link><span className="eyebrow">Account settings</span><h1>Your profile.</h1><p className="lede">Manage the identity used for administrator actions.</p></div><button className="button secondary" onClick={logout}>Log out</button></div><section className="form-panel"><form className="form-stack" onSubmit={save}><label>Display name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input value={profile.email} disabled /></label><label>Role<input value={profile.role} disabled /></label>{message && <div className="form-result success">{message}</div>}{error && <div className="form-result error">{error}</div>}<button className="button primary" type="submit">Save profile</button></form></section></main>;
}