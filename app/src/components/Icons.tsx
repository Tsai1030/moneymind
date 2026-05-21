import type { SVGProps } from 'react';

const base = { width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 3l9 8h-2v9h-5v-6h-4v6H5v-9H3l9-8z" /></svg>
);
export const ChartIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></svg>
);
export const CardIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></svg>
);
export const UserIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="7" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
);
export const SettingsIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
);
export const DeleteIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} width={22} height={22} {...p}><path d="M21 5H8l-5 7 5 7h13a2 2 0 002-2V7a2 2 0 00-2-2zM18 9l-6 6M12 9l6 6" /></svg>
);
export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const FilterIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...base} {...p}><path d="M4 6h16M7 12h10M10 18h4" /></svg>
);
