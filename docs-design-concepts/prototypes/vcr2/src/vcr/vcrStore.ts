import { create } from 'zustand';

export type VCRDisplayMode = 'off' | 'timecode' | 'status';

interface VCRStore {
  displayMode: VCRDisplayMode;
  timecodeSeconds: number;
  statusText: string;
  setDisplayOff: () => void;
  setStatusText: (statusText: string) => void;
  setTimecodeSeconds: (seconds: number) => void;
}

export const useVCRStore = create<VCRStore>((set) => ({
  displayMode: 'off',
  timecodeSeconds: 0,
  statusText: 'STOP',
  setDisplayOff: () => {
    set({ displayMode: 'off' });
  },
  setStatusText: (statusText) => {
    set({ displayMode: 'status', statusText });
  },
  setTimecodeSeconds: (seconds) => {
    set({ displayMode: 'timecode', timecodeSeconds: Math.max(seconds, 0) });
  },
}));
