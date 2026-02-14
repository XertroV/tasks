import { create } from 'zustand';

interface AudioState {
  initialized: boolean;
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  muted: boolean;
}

interface AudioActions {
  initialize: () => void;
  setMasterVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setAmbientVolume: (volume: number) => void;
  toggleMute: () => void;
}

type AudioStore = AudioState & AudioActions;

class AudioEngineClass {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  getContext(): AudioContext | null {
    return this.context;
  }

  getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  getSfxGain(): GainNode | null {
    return this.sfxGain;
  }

  getAmbientGain(): GainNode | null {
    return this.ambientGain;
  }

  async initialize(): Promise<boolean> {
    if (this.context) {
      return true;
    }

    try {
      this.context = new AudioContext();

      this.masterGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.ambientGain = this.context.createGain();

      this.sfxGain.connect(this.masterGain);
      this.ambientGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);

      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      return true;
    } catch (error) {
      console.error('[AudioEngine] Failed to initialize:', error);
      return false;
    }
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setSfxVolume(volume: number): void {
    if (this.sfxGain) {
      this.sfxGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setAmbientVolume(volume: number): void {
    if (this.ambientGain) {
      this.ambientGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setMuted(muted: boolean): void {
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : useAudioStore.getState().masterVolume;
    }
  }
}

export const AudioEngine = new AudioEngineClass();

export const useAudioStore = create<AudioStore>((set, get) => ({
  initialized: false,
  masterVolume: 0.8,
  sfxVolume: 1.0,
  ambientVolume: 0.6,
  muted: false,

  initialize: () => {
    const state = get();
    if (state.initialized) return;

    AudioEngine.initialize().then((success) => {
      if (success) {
        AudioEngine.setMasterVolume(state.masterVolume);
        AudioEngine.setSfxVolume(state.sfxVolume);
        AudioEngine.setAmbientVolume(state.ambientVolume);
        set({ initialized: true });
      }
    });
  },

  setMasterVolume: (volume: number) => {
    set({ masterVolume: volume });
    if (!get().muted) {
      AudioEngine.setMasterVolume(volume);
    }
  },

  setSfxVolume: (volume: number) => {
    set({ sfxVolume: volume });
    AudioEngine.setSfxVolume(volume);
  },

  setAmbientVolume: (volume: number) => {
    set({ ambientVolume: volume });
    AudioEngine.setAmbientVolume(volume);
  },

  toggleMute: () => {
    const newMuted = !get().muted;
    set({ muted: newMuted });
    AudioEngine.setMuted(newMuted);
  },
}));

export function initAudioOnInteraction(): void {
  const handler = () => {
    useAudioStore.getState().initialize();
    document.removeEventListener('click', handler);
    document.removeEventListener('keydown', handler);
  };

  document.addEventListener('click', handler);
  document.addEventListener('keydown', handler);
}
