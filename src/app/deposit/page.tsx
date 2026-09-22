import DepositForm from "@/components/DepositForm";
import { redirect } from "next/navigation";

export default async function DepositPage({ searchParams }: { searchParams: Promise<{ pool?: string }> }) {
  const { pool } = await searchParams;
  if (!pool) redirect("/pools");
  
  return <main className="shell page-space narrow-page"><div className="page-heading"><div><span className="eyebrow">Contribution check</span><h1>Make your payment count.</h1><p className="lede">Enter the reference from your bank or wallet receipt. We check it with the payment provider before adding it to the goal.</p></div></div><section className="form-panel"><DepositForm poolId={pool} /></section></main>;
}