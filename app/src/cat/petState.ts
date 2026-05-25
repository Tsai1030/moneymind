import type { Mood } from './constants';

export type PetStateKind = 'thriving' | 'happy' | 'ok' | 'hungry' | 'sick' | 'hiding';

export function derivePetState(hp: number): PetStateKind {
  if (hp <= 0) return 'hiding';
  if (hp < 20) return 'sick';
  if (hp < 40) return 'hungry';
  if (hp < 60) return 'ok';
  if (hp < 80) return 'happy';
  return 'thriving';
}

export function petStateToMood(state: PetStateKind): Mood {
  switch (state) {
    case 'thriving': return 'excited';
    case 'happy':
    case 'ok':      return 'happy';
    case 'hungry':  return 'worried';
    case 'sick':
    case 'hiding':  return 'sleeping';
  }
}

export function petStateFilter(state: PetStateKind): string | undefined {
  switch (state) {
    case 'hungry': return 'grayscale(0.3)';
    case 'sick':   return 'grayscale(0.6) opacity(0.75)';
    default:       return undefined;
  }
}

export const PET_STATE_LABEL: Record<PetStateKind, string> = {
  thriving: '活力滿滿',
  happy:    '心情不錯',
  ok:       '還行',
  hungry:   '有點餓',
  sick:     '不太舒服',
  hiding:   '躲起來了',
};

export const PET_STATE_HINT: Record<PetStateKind, string> = {
  thriving: '繼續保持！',
  happy:    '記一筆讓牠更開心',
  ok:       '今天記了嗎？',
  hungry:   '該餵食了',
  sick:     '快回來看看牠',
  hiding:   '記一筆讓牠回來',
};
