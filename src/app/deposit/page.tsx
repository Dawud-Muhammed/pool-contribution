import DepositForm from "@/components/DepositForm";

export default async function DepositPage({ searchParams }: { searchParams: Promise<{ pool?: string }> }) {
  const { pool } = await searchParams;
  return <main className="shell page-space narrow-page"><div className="page-heading"><div><span className="eyebrow">Receipt verification</span><h1>Bring your contribution on record.</h1><p className="lede">Submit the reference from your bank or wallet receipt. We check it with the issuing provider before it can enter a pool.</p></div></div><section className="form-panel"><DepositForm poolId={pool} /></section><p className="privacy-note"><strong>Privacy by design.</strong> Public ledgers use a non-reversible pseudonym. Your payer name and raw receipt stay in the admin-only record.</p></main>;
}