"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminProfileClient() {
  const [profile, setProfile] = useState<{ name: string; email: string; role: string } | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
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

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    const response = await fetch("/api/admin/profile/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
    const result = await response.json();
    if (!response.ok) { setPasswordError(result.error || "Password update failed."); return; }
    setCurrentPassword("");
    setNewPassword("");
    setPasswordMessage(result.message);
  }

  async function logout() { await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); router.push("/admin/login"); }

  if (error) return <main className="shell page-space"><div className="error-panel"><h1>Admin access required</h1><p>{error}</p><Link className="button primary" href="/admin/login">Go to sign in</Link></div></main>;
  if (!profile) return <main className="shell page-space"><div className="loading-line">Loading profile...</div></main>;
  return <main className="shell page-space narrow-page"><div className="page-heading"><div><Link className="back-link" href="/admin/pools">← Admin pools</Link><span className="eyebrow">Account settings</span><h1>Your profile.</h1><p className="lede">Manage the identity used for administrator actions.</p></div><button className="button secondary" onClick={logout}>Log out</button></div><section className="form-panel"><form className="form-stack" onSubmit={save}><span className="eyebrow">Profile</span><label>Display name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input value={profile.email} disabled /></label><label>Role<input value={profile.role} disabled /></label><p className="field-note">Roles are controlled by the database. Available roles are <strong>user</strong> for contributors and <strong>admin</strong> for administrators.</p>{message && <div className="form-result success">{message}</div>}{error && <div className="form-result error">{error}</div>}<button className="button primary" type="submit">Save profile</button></form></section><section className="form-panel profile-section"><form className="form-stack" onSubmit={changePassword}><span className="eyebrow">Security</span><h2>Change password</h2><label>Current password<input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label>New password<input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>{passwordMessage && <div className="form-result success">{passwordMessage}</div>}{passwordError && <div className="form-result error">{passwordError}</div>}<button className="button primary" type="submit">Update password</button></form></section></main>;
}