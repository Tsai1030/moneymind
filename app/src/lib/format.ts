export function fmtMoney(n: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(Math.round(n));
  const s = abs.toLocaleString('en-US');
  if (!opts.sign) return s;
  return n < 0 ? `−${s}` : n > 0 ? `+${s}` : s;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
