import Link from "next/link";

export default function Home() {
  return (
    <main className="home-shell"><section className="home-copy"><span className="eyebrow">Community giving, made clear</span><h1>Small gifts.<br /><em>Shared progress.</em></h1><p>Poolhouse helps people contribute to a shared goal with confidence. See the target, follow the progress, and keep every contributor’s identity private.</p><div className="home-actions"><Link className="button primary" href="/pools">Explore open pools <span>↗</span></Link></div></section><section className="home-signal"><div className="signal-orbit"><div className="orbit-line" /><div className="signal-core"><span>01</span><strong>Good things<br />grow<br />together.</strong></div></div><div className="signal-caption"><span>ONE CLEAR RECORD</span><p>Every pool shows the same simple story: what the goal is, how much has arrived, and what remains.</p></div></section></main>
  );
}
