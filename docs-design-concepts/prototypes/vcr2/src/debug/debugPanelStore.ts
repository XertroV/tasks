import { create } from 'zustand';

export interface PerformanceSnapshot {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  memoryUsedMB: number;
}

export interface VCRSnapshot {
  mode: string;
  timecode: string;
}

export interface NavigationSnapshot {
  section: string;
  page: string;
}

export interface HorrorSnapshot {
  phase: string;
  intensity: number;
}

interface DebugPanelStore {
  performance: PerformanceSnapshot;
  vcr: VCRSnapshot;
  navigation: NavigationSnapshot;
  horror: HorrorSnapshot;
  setPerformance: (snapshot: PerformanceSnapshot) => void;
  setVCR: (snapshot: VCRSnapshot) => void;
  setNavigation: (snapshot: NavigationSnapshot) => void;
  setHorror: (snapshot: HorrorSnapshot) => void;
}

export const useDebugPanelStore = create<DebugPanelStore>((set) => ({
  performance: {
    fps: 0,
    frameTimeMs: 0,
    drawCalls: 0,
    triangles: 0,
    memoryUsedMB: 0,
  },
  vcr: {
    mode: 'UNINITIALIZED',
    timecode: '--:--:--',
  },
  navigation: {
    section: 'UNINITIALIZED',
    page: '--',
  },
  horror: {
    phase: 'DORMANT',
    intensity: 0,
  },
  setPerformance: (snapshot) => {
    set({ performance: snapshot });
  },
  setVCR: (snapshot) => {
    set({ vcr: snapshot });
  },
  setNavigation: (snapshot) => {
    set({ navigation: snapshot });
  },
  setHorror: (snapshot) => {
    set({ horror: snapshot });
  },
}));
