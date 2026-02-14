import { AudioEngine } from './AudioEngine';

class ProceduralSynthClass {
  createLightgunShot(): void {
    const ctx = AudioEngine.getContext();
    const sfxGain = AudioEngine.getSfxGain();

    if (!ctx || !sfxGain) return;

    const now = ctx.currentTime;

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.01));
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;
    noiseFilter.Q.value = 1;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(sfxGain);

    noiseSource.start(now);
    noiseSource.stop(now + 0.05);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(oscGain);
    oscGain.connect(sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  createButtonClick(): void {
    const ctx = AudioEngine.getContext();
    const sfxGain = AudioEngine.getSfxGain();

    if (!ctx || !sfxGain) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(now);
    osc.stop(now + 0.02);
  }

  createVcrTransport(): void {
    const ctx = AudioEngine.getContext();
    const sfxGain = AudioEngine.getSfxGain();

    if (!ctx || !sfxGain) return;

    const now = ctx.currentTime;

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);

    noiseSource.start(now);
    noiseSource.stop(now + 0.1);
  }

  createMenuClick(): void {
    const ctx = AudioEngine.getContext();
    const sfxGain = AudioEngine.getSfxGain();

    if (!ctx || !sfxGain) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(now);
    osc.stop(now + 0.015);
  }
}

export const ProceduralSynth = new ProceduralSynthClass();

export function playLightgunShot(): void {
  ProceduralSynth.createLightgunShot();
}

export function playButtonClick(): void {
  ProceduralSynth.createButtonClick();
}

export function playVcrTransport(): void {
  ProceduralSynth.createVcrTransport();
}

export function playMenuClick(): void {
  ProceduralSynth.createMenuClick();
}
