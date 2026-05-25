import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import dayjs from 'dayjs';

type Tab = 'home' | 'analytics' | 'accounts' | 'me';

interface UIState {
  theme: 'light' | 'dark';
  tab: Tab;
  month: string;
  inputOpen: boolean;
  editingTxId: string | null;
  detailTxId: string | null;
  petOpen: boolean;
  setTheme: (t: UIState['theme']) => void;
  setTab: (t: Tab) => void;
  setMonth: (m: string) => void;
  openInput: () => void;
  openInputForEdit: (id: string) => void;
  closeInput: () => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  openPet: () => void;
  closePet: () => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      tab: 'home',
      month: dayjs().format('YYYY-MM'),
      inputOpen: false,
      editingTxId: null,
      detailTxId: null,
      petOpen: false,
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
      setTab: (tab) => set({ tab }),
      setMonth: (month) => set({ month }),
      openInput: () => set({ inputOpen: true, editingTxId: null }),
      openInputForEdit: (id) => set({ inputOpen: true, editingTxId: id, detailTxId: null }),
      closeInput: () => set({ inputOpen: false, editingTxId: null }),
      openDetail: (id) => set({ detailTxId: id }),
      closeDetail: () => set({ detailTxId: null }),
      openPet: () => set({ petOpen: true }),
      closePet: () => set({ petOpen: false }),
    }),
    {
      name: 'moneymind-ui',
      partialize: (s) => ({ theme: s.theme, tab: s.tab, month: s.month }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) document.documentElement.setAttribute('data-theme', state.theme);
      },
    },
  ),
);
