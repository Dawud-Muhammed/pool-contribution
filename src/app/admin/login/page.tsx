"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe: true }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || result.error || "Sign in failed.");
      }

      router.push("/admin/pools");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed.");
      setLoading(false);
    }
  }

  return (
    <main className="shell page-space narrow-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Restricted workspace</span>
          <h1>Admin sign in.</h1>
          <p className="lede">Sign in with an account whose database role is set to admin.</p>
        </div>
      </div>
      <section className="form-panel">
        <form className="form-stack" onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <div className="form-result error" role="alert">{error}</div>}
          <button className="button primary" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in to admin"}</button>
        </form>
      </section>
    </main>
  );
}