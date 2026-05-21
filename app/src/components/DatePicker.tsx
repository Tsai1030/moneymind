import { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { BottomSheet } from './BottomSheet';

interface Props {
  open: boolean;
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  onClose: () => void;
  maxDate?: string;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function DatePicker({ open, value, onChange, onClose, maxDate }: Props) {
  const [viewMonth, setViewMonth] = useState(() => dayjs(value).format('YYYY-MM'));

  useEffect(() => {
    if (open) setViewMonth(dayjs(value).format('YYYY-MM'));
  }, [open, value]);

  const today = dayjs().format('YYYY-MM-DD');
  const max = maxDate ?? today;

  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth]);

  const view = dayjs(`${viewMonth}-01`);
  const maxMonthStr = max.slice(0, 7);
  const canGoNext = viewMonth < maxMonthStr;

  return (
    <BottomSheet open={open} onClose={onClose} title="選擇日期">
      <div className="flex items-center justify-between mb-4 px-2">
        <button
          onClick={() => setViewMonth(view.subtract(1, 'month').format('YYYY-MM'))}
          className="w-9 h-9 rounded-full grid place-items-center text-[18px] font-semibold"
          style={{ background: 'var(--bg-subtle)' }}
        >‹</button>
        <div className="text-[16px] font-bold num">{view.format('YYYY 年 M 月')}</div>
        <button
          onClick={() => setViewMonth(view.add(1, 'month').format('YYYY-MM'))}
          disabled={!canGoNext}
          className="w-9 h-9 rounded-full grid place-items-center text-[18px] font-semibold disabled:opacity-30"
          style={{ background: 'var(--bg-subtle)' }}
        >›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className="text-center text-[11px] font-semibold py-1.5"
            style={{ color: i === 0 || i === 6 ? 'var(--text-ink-3)' : 'var(--text-ink-2)' }}
          >{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const dateStr = c.date;
          const isSelected = dateStr === value;
          const isToday = dateStr === today;
          const disabled = dateStr > max;
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => { onChange(dateStr); onClose(); }}
              className="aspect-square rounded-full text-[14px] font-semibold num disabled:opacity-25 transition relative"
              style={{
                background: isSelected ? 'var(--accent)' : 'transparent',
                color: isSelected
                  ? 'var(--accent-fg)'
                  : isToday
                    ? 'var(--color-brand-deep)'
                    : 'var(--text-ink)',
              }}
            >
              {c.day}
              {isToday && !isSelected && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 bottom-1 w-1 h-1 rounded-full"
                  style={{ background: 'var(--color-brand)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { onChange(today); onClose(); }}
          className="flex-1 py-3 rounded-full text-[13px] font-semibold"
          style={{ background: 'var(--bg-subtle)' }}
        >今天</button>
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-full text-[13px] font-semibold"
          style={{ background: 'var(--bg-subtle)' }}
        >關閉</button>
      </div>
    </BottomSheet>
  );
}

function buildMonthCells(monthStr: string): ({ day: number; date: string } | null)[] {
  const start = dayjs(`${monthStr}-01`);
  const offset = start.day(); // 0 = Sunday
  const daysInMonth = start.daysInMonth();
  const cells: ({ day: number; date: string } | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: start.date(d).format('YYYY-MM-DD') });
  }
  // pad to multiple of 7
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
