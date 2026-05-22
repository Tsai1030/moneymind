export type Mood = 'happy' | 'excited' | 'worried' | 'sleeping';

export const MOOD_EMOJI: Record<Mood, string> = {
  happy: '😺',
  excited: '😻',
  worried: '😿',
  sleeping: '😴',
};

export const MOOD_LABEL: Record<Mood, string> = {
  happy: '心情不錯',
  excited: '超興奮！',
  worried: '有點擔心',
  sleeping: '睡著了',
};
