type PoolProgressBarProps = {
  total: number | string;
  cap: number | string;
  currency?: string;
  showValues?: boolean;
};

export default function PoolProgressBar({
  total,
  cap,
  currency = "ETB",
  showValues = true,
}: PoolProgressBarProps) {
  const raised = Number(total);
  const target = Number(cap);
  const percentage = target > 0 ? Math.min(100, (raised / target) * 100) : 0;

  return (
    <div className="progress-wrap">
      {showValues && (
        <div className="progress-label">
          <strong>{raised.toLocaleString()} {currency}</strong>
          <span>{percentage.toFixed(0)}% of {target.toLocaleString()} {currency}</span>
        </div>
      )}
      <div className="progress-track" aria-label={`${percentage.toFixed(0)} percent funded`} role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}