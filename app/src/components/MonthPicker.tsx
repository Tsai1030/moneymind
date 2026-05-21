import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { BottomSheet } from './BottomSheet';

interface Props {
  open: boolean;
  value: string; // YYYY-MM
  onChange: (v: string) => void;
  onClose: () => void;
  maxMonth?: string; // YYYY-MM, defaults to this month
}

export function MonthPicker({ open, value, onChange, onClose, maxMonth }: Props) {
  const [year, setYear] = useState(() => parseInt(value.slice(0, 4), 10));

  useEffect(() => {
    if (open) setYear(parseInt(value.slice(0, 4), 10));
  }, [open, value]);

  const max = maxMonth ?? dayjs().format('YYYY-MM');
  const maxYear = parseInt(max.slice(0, 4), 10);
  const maxMonthNum = parseInt(max.slice(5, 7), 10);
  const selectedYear = parseInt(value.slice(0, 4), 10);
  const selectedMonth = parseInt(value.slice(5, 7), 10);

  return (
    <BottomSheet open={open} onClose={onClose} title="選擇月份">
      <div className="flex items-center justify-between mb-5 px-2">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="w-9 h-9 rounded-full grid place-items-center text-[18px] font-semibold"
          style={{ background: 'var(--bg-subtle)' }}
        >‹</button>
        <div className="text-[18px] font-bold num">{year} 年</div>
        <button
          onClick={() => setYear((y) => Math.min(y + 1, maxYear))}
          disabled={year >= maxYear}
          className="w-9 h-9 rounded-full grid place-items-center text-[18px] font-semibold disabled:opacity-30"
          style={{ background: 'var(--bg-subtle)' }}
        >›</button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const isSelected = year === selectedYear && m === selectedMonth;
          const disabled = year === maxYear && m > maxMonthNum;
          return (
            <button
              key={m}
              disabled={disabled}
              onClick={() => {
                const mm = String(m).padStart(2, '0');
                onChange(`${year}-${mm}`);
                onClose();
              }}
              className="py-3 rounded-2xl text-[14px] font-semibold disabled:opacity-25 transition"
              style={{
                background: isSelected ? 'var(--accent)' : 'var(--bg-subtle)',
                color: isSelected ? 'var(--accent-fg)' : 'var(--text-ink)',
              }}
            >{m} 月</button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
