import { useHorrorStore } from '@/horror';
import { create } from 'zustand';

export interface SettingsState {
  isOpen: boolean;
  horrorEnabled: boolean;
  masterVolume: number;
  reducedMotion: boolean;
}

export interface SettingsActions {
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  setHorrorEnabled: (enabled: boolean) => void;
  setMasterVolume: (volume: number) => void;
  setReducedMotion: (enabled: boolean) => void;
  syncWithHorrorStore: () => void;
  syncWithSystemPreferences: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getHorrorFromUrl(): boolean | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const horrorParam = params.get('horror');
  if (horrorParam === 'false') return false;
  if (horrorParam === 'true') return true;
  return null;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  isOpen: false,
  horrorEnabled: true,
  masterVolume: 0.7,
  reducedMotion: getPrefersReducedMotion(),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open: boolean) => set({ isOpen: open }),

  setHorrorEnabled: (enabled: boolean) => {
    set({ horrorEnabled: enabled });
    useHorrorStore.getState().setEnabled(enabled);
  },

  setMasterVolume: (volume: number) => set({ masterVolume: Math.max(0, Math.min(1, volume)) }),

  setReducedMotion: (enabled: boolean) => set({ reducedMotion: enabled }),

  syncWithHorrorStore: () => {
    const horrorEnabled = useHorrorStore.getState().enabled;
    set({ horrorEnabled });
  },

  syncWithSystemPreferences: () => {
    if (typeof window === 'undefined') return;

    const reducedMotion = getPrefersReducedMotion();
    set({ reducedMotion });

    const horrorFromUrl = getHorrorFromUrl();
    if (horrorFromUrl !== null) {
      set({ horrorEnabled: horrorFromUrl });
      useHorrorStore.getState().setEnabled(horrorFromUrl);
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      set({ reducedMotion: e.matches });
    };
    mediaQuery.addEventListener('change', handleChange);
  },
}));
