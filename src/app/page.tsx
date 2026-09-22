import Link from "next/link";

export default function Home() {
  return (
    <main className="home-shell"><section className="home-copy"><span className="eyebrow">A clearer way to gather</span><h1>Small contributions.<br /><em>Shared momentum.</em></h1><p>Poolhouse makes community lending visible and accountable: verified receipts, hard caps, and a public ledger that keeps every contributor pseudonymous.</p><div className="home-actions"><Link className="button primary" href="/pools">Explore live pools <span>↗</span></Link></div></section><section className="home-signal"><div className="signal-orbit"><div className="orbit-line" /><div className="signal-core"><span>01</span><strong>Trust<br />travels<br />further.</strong></div></div><div className="signal-caption"><span>01 / 03</span><p>Every pool has one source of truth. Follow progress without needing to know who is behind each contribution.</p></div></section></main>
  );
}
