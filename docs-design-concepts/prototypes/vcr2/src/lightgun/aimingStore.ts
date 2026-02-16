import { create } from 'zustand';
import type { CursorState } from './AimingSystem';

interface AimingState {
  cursorState: CursorState;
  currentTargetId: string | null;
  setCursorState: (state: CursorState) => void;
  setCurrentTargetId: (id: string | null) => void;
}

export const useAimingStore = create<AimingState>((set) => ({
  cursorState: 'idle',
  currentTargetId: null,
  setCursorState: (state) => set({ cursorState: state }),
  setCurrentTargetId: (id) => set({ currentTargetId: id }),
}));
