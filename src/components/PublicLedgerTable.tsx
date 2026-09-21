type LedgerEntry = {
  id: string;
  pseudonym: string;
  type: string;
  amount: string;
  createdAt: string;
};

const labels: Record<string, string> = {
  contribution: "Contribution",
  refund: "Refund",
  waiver: "Waiver",
};

export default function PublicLedgerTable({ entries }: { entries: LedgerEntry[] }) {
  if (!entries.length) {
    return <div className="empty-state">No ledger entries yet. The first verified contribution will appear here.</div>;
  }

  return (
    <div className="table-scroll">
      <table className="ledger-table">
        <thead>
          <tr><th>Contributor</th><th>Event</th><th>Amount</th><th>Recorded</th></tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td><span className="pseudonym">{entry.pseudonym}</span></td>
              <td><span className={`event-tag ${entry.type}`}>{labels[entry.type] || entry.type}</span></td>
              <td className={entry.type === "refund" ? "amount negative" : "amount"}>
                {entry.type === "refund" ? "-" : "+"}{Number(entry.amount).toLocaleString()} ETB
              </td>
              <td className="muted">{new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}