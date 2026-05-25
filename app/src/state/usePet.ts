import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';

const HP_MAX = 100;
const DECAY_PER_DAY = 8; // ~12.5 days from full to hiding
const REVIVE_HP = 40;
const DAY_MS = 24 * 60 * 60 * 1000;
const COOKIE_MAX = 3;            // max cookies in jar at once
const COOKIE_HP_GAIN = 8;        // HP gained per consumed cookie

export type FeedKind = 'open' | 'transaction' | 'greeting';

// `transaction` here is an internal counter for daily "cookies earned" cap
const FEED_AMOUNT: Record<FeedKind, number> = {
  open: 3,
  transaction: 0, // unused — transactions award cookies, not direct HP
  greeting: 1,
};
const DAILY_CAP: Record<FeedKind, number> = {
  open: 1,
  transaction: 3, // max 3 cookies earned per day
  greeting: 1,
};

interface PetState {
  hp: number;
  name: string;
  bornAt: number;
  lastTickAt: number;
  feedDay: string; // YYYY-MM-DD — for resetting daily counters
  feeds: Record<FeedKind, number>;
  cookies: number; // current cookies in jar

  tick: () => void;
  feed: (kind: FeedKind) => boolean; // returns true if actually fed
  awardCookie: () => boolean;        // called on each transaction record
  consumeCookie: () => boolean;      // called when user taps a cookie
  rename: (name: string) => void;
  reset: () => void;
}

const today = () => dayjs().format('YYYY-MM-DD');

export const usePet = create<PetState>()(
  persist(
    (set, get) => ({
      hp: HP_MAX,
      name: '貓貓',
      bornAt: Date.now(),
      lastTickAt: Date.now(),
      feedDay: today(),
      feeds: { open: 0, transaction: 0, greeting: 0 },
      cookies: 0,

      tick: () => {
        const now = Date.now();
        const state = get();
        const daysElapsed = Math.floor((now - state.lastTickAt) / DAY_MS);
        const dayChanged = state.feedDay !== today();
        if (daysElapsed <= 0 && !dayChanged) return;

        const decayedHp = Math.max(0, state.hp - DECAY_PER_DAY * Math.max(0, daysElapsed));
        set({
          hp: decayedHp,
          // Advance lastTickAt by full days so partial-day remainder is preserved
          lastTickAt: state.lastTickAt + daysElapsed * DAY_MS,
          feedDay: today(),
          feeds: dayChanged ? { open: 0, transaction: 0, greeting: 0 } : state.feeds,
        });
      },

      feed: (kind) => {
        const state = get();
        // hiding state — only a transaction can bring the cat back
        if (state.hp === 0 && kind !== 'transaction') return false;

        const dayChanged = state.feedDay !== today();
        const feeds = dayChanged ? { open: 0, transaction: 0, greeting: 0 } : state.feeds;
        if (feeds[kind] >= DAILY_CAP[kind]) {
          if (dayChanged) set({ feedDay: today(), feeds });
          return false;
        }

        const baseHp = state.hp === 0 && kind === 'transaction' ? REVIVE_HP : state.hp;
        const newHp = Math.min(HP_MAX, baseHp + FEED_AMOUNT[kind]);
        set({
          hp: newHp,
          feedDay: today(),
          feeds: { ...feeds, [kind]: feeds[kind] + 1 },
        });
        return true;
      },

      awardCookie: () => {
        const state = get();
        const today_ = today();
        const dayChanged = state.feedDay !== today_;
        const feeds = dayChanged
          ? { open: 0, transaction: 0, greeting: 0 }
          : state.feeds;
        // Daily earning cap
        if (feeds.transaction >= DAILY_CAP.transaction) {
          if (dayChanged) set({ feedDay: today_, feeds });
          return false;
        }
        // Jar full — extra cookies are wasted (encourages feeding)
        if (state.cookies >= COOKIE_MAX) {
          set({
            feedDay: today_,
            feeds: { ...feeds, transaction: feeds.transaction + 1 },
          });
          return false;
        }
        set({
          cookies: state.cookies + 1,
          feedDay: today_,
          feeds: { ...feeds, transaction: feeds.transaction + 1 },
        });
        return true;
      },

      consumeCookie: () => {
        const state = get();
        if (state.cookies <= 0) return false;
        // Hiding cat: a fed cookie also revives
        const baseHp = state.hp === 0 ? REVIVE_HP : state.hp;
        const newHp = Math.min(HP_MAX, baseHp + COOKIE_HP_GAIN);
        set({ cookies: state.cookies - 1, hp: newHp });
        return true;
      },

      rename: (name) => {
        const trimmed = name.trim().slice(0, 12);
        set({ name: trimmed || '貓貓' });
      },

      reset: () => set({
        hp: HP_MAX,
        bornAt: Date.now(),
        lastTickAt: Date.now(),
        feedDay: today(),
        feeds: { open: 0, transaction: 0, greeting: 0 },
        cookies: 0,
      }),
    }),
    { name: 'moneymind-pet' },
  ),
);

export const PET_CONSTANTS = {
  HP_MAX, DECAY_PER_DAY, REVIVE_HP, FEED_AMOUNT, DAILY_CAP,
  COOKIE_MAX, COOKIE_HP_GAIN,
};
