const DAILY_TARGET_MINUTES = 8 * 60;

// Speedometer-style dial: 270° sweep with the gap at the bottom.
const START_ANGLE = 135; // degrees clockwise from 3 o'clock
const SWEEP = 270;
const TICK_STEP = 15;

function polar(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/**
 * Dial gauge showing logged minutes against a target. Arc caps at 100%;
 * the percentage readout keeps counting past it.
 */
export default function ProgressRing({
  minutes,
  targetMinutes = DAILY_TARGET_MINUTES,
  size = 148,
  stroke = 10,
  variant = '',
  caption = null,
}) {
  const ratio = targetMinutes > 0 ? minutes / targetMinutes : 0;
  const pct = Math.round(ratio * 100);
  const clamped = Math.min(1, ratio);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const targetHours = Math.round(targetMinutes / 60);

  const cx = size / 2;
  const cy = size / 2;
  const tickOuter = size / 2 - 2;
  const tickInner = tickOuter - 6;
  const arcR = tickInner - 7 - stroke / 2;
  const circumference = 2 * Math.PI * arcR;
  const arcLength = circumference * (SWEEP / 360);

  const tickCount = SWEEP / TICK_STEP; // ticks at every step, ends included
  const ticks = [];
  for (let i = 0; i <= tickCount; i++) {
    const angle = START_ANGLE + i * TICK_STEP;
    const bold = i === 0 || i === tickCount;
    const [x1, y1] = polar(cx, cy, tickInner - (bold ? 2 : 0), angle);
    const [x2, y2] = polar(cx, cy, tickOuter, angle);
    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className={bold ? 'tick tick-bold' : 'tick'}
      />
    );
  }

  return (
    <div className={`ring-wrap ${variant}`}>
      <div
        className="progress-ring"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${h} hours ${m} minutes logged, ${pct}% of the ${targetHours} hour target`}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {ticks}
          <circle
            className="ring-track"
            cx={cx}
            cy={cy}
            r={arcR}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            transform={`rotate(${START_ANGLE} ${cx} ${cy})`}
          />
          {clamped > 0 && (
            <circle
              className="ring-progress"
              cx={cx}
              cy={cy}
              r={arcR}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${arcLength * clamped} ${circumference}`}
              transform={`rotate(${START_ANGLE} ${cx} ${cy})`}
            />
          )}
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
