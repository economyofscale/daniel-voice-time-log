import { useEffect, useState } from 'react';
import { getDatesWithEntries, todayLocal } from './lib/db.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Month grid. Days with logged entries get a dot; clicking a day selects it.
 * Weeks start on Monday.
 */
export default function Calendar({ selectedDate, onSelect, refreshKey }) {
  const [year, setYear] = useState(() => Number(selectedDate.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(selectedDate.slice(5, 7))); // 1-12
  const [markedDates, setMarkedDates] = useState(new Set());

  const yearMonth = `${year}-${pad(month)}`;

  useEffect(() => {
    let cancelled = false;
    getDatesWithEntries(yearMonth).then((dates) => {
      if (!cancelled) setMarkedDates(dates);
    });
    return () => {
      cancelled = true;
    };
  }, [yearMonth, refreshKey]);

  function shiftMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  // getDay(): 0 = Sunday. Convert so Monday = 0.
  const firstOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const today = todayLocal();

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const cells = [];
  for (let i = 0; i < firstOffset; i++) {
    cells.push(<span key={`pad-${i}`} className="cal-cell cal-empty" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${yearMonth}-${pad(day)}`;
    const classes = ['cal-cell', 'cal-day'];
    if (date === today) classes.push('cal-today');
    if (date === selectedDate) classes.push('cal-selected');
    if (markedDates.has(date)) classes.push('cal-has-entries');
    cells.push(
      <button
        key={date}
        className={classes.join(' ')}
        onClick={() => onSelect(date)}
      >
        {day}
        <span className="cal-dot" />
      </button>
    );
  }

  return (
    <section className="calendar">
      <div className="cal-header">
        <button className="cal-nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <span className="cal-month">{monthLabel}</span>
        <button className="cal-nav" onClick={() => shiftMonth(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((d) => (
          <span key={d} className="cal-cell cal-weekday">
            {d}
          </span>
        ))}
        {cells}
      </div>
    </section>
  );
}
