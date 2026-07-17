const DAILY_TARGET_MINUTES = 8 * 60;

/**
 * Activity-ring style donut showing logged minutes against the daily target.
 * The arc caps at 100%; the percentage label keeps counting past it.
 */
export default function ProgressRing({
  minutes,
  targetMinutes = DAILY_TARGET_MINUTES,
  size = 132,
  stroke = 12,
  variant = '',
  caption = null,
}) {
  const ratio = targetMinutes > 0 ? minutes / targetMinutes : 0;
  const pct = Math.round(ratio * 100);
  const clamped = Math.min(1, ratio);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  const targetHours = Math.round(targetMinutes / 60);

  return (
    <div className={`ring-wrap ${variant}`}>
    <div
      className="progress-ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${h} hours ${m} minutes logged, ${pct}% of the ${targetHours} hour target`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">
        <span className="ring-time">
          {h}h {String(m).padStart(2, '0')}m
        </span>
        <span className="ring-pct">{pct}%</span>
      </div>
    </div>
    {caption && <span className="ring-caption">{caption}</span>}
    </div>
  );
}
