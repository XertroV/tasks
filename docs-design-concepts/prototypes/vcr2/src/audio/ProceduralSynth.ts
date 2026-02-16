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

  createWhisper(intensity: number): { source: AudioBufferSourceNode; gain: GainNode } | null {
    const ctx = AudioEngine.getContext();
    const ambientGain = AudioEngine.getAmbientGain();

    if (!ctx || !ambientGain) return null;

    const duration = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      const noise = Math.random() * 2 - 1;
      const am = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t);
      const envelope = Math.sin((Math.PI * t) / duration);
      data[i] = noise * am * envelope * 0.3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 2;

    const gain = ctx.createGain();
    const volume = Math.max(0.02, Math.min(0.15, intensity * 0.15));
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ambientGain);

    return { source, gain };
  }

  createEntitySound(): void {
    const ctx = AudioEngine.getContext();
    const sfxGain = AudioEngine.getSfxGain();

    if (!ctx || !sfxGain) return;

    const now = ctx.currentTime;

    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'sine';
    droneOsc.frequency.setValueAtTime(60, now);
    droneOsc.frequency.exponentialRampToValueAtTime(40, now + 0.5);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.4, now);
    droneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    droneOsc.connect(droneGain);
    droneGain.connect(sfxGain);

    droneOsc.start(now);
    droneOsc.stop(now + 0.5);

    const hissDuration = 0.8;
    const hissBuffer = ctx.createBuffer(1, ctx.sampleRate * hissDuration, ctx.sampleRate);
    const hissData = hissBuffer.getChannelData(0);
    for (let i = 0; i < hissData.length; i++) {
      const t = i / ctx.sampleRate;
      const envelope = Math.exp(-t * 3);
      hissData[i] = (Math.random() * 2 - 1) * envelope * 0.5;
    }

    const hissSource = ctx.createBufferSource();
    hissSource.buffer = hissBuffer;

    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'highpass';
    hissFilter.frequency.value = 4000;

    const hissGain = ctx.createGain();
    hissGain.gain.setValueAtTime(0.3, now + 0.1);
    hissGain.gain.exponentialRampToValueAtTime(0.001, now + hissDuration);

    hissSource.connect(hissFilter);
    hissFilter.connect(hissGain);
    hissGain.connect(sfxGain);

    hissSource.start(now + 0.1);
    hissSource.stop(now + hissDuration);
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

export function createWhisper(
  intensity: number
): { source: AudioBufferSourceNode; gain: GainNode } | null {
  return ProceduralSynth.createWhisper(intensity);
}

export function playEntitySound(): void {
  ProceduralSynth.createEntitySound();
}

export interface TapeHissNodes {
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
}

export interface CrackleNodes {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export interface ScreechNodes {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export function createTapeHiss(): TapeHissNodes | null {
  const ctx = AudioEngine.getContext();
  const ambientGain = AudioEngine.getAmbientGain();

  if (!ctx || !ambientGain) return null;

  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 8000;

  const gain = ctx.createGain();
  gain.gain.value = 0.08;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ambientGain);

  return { source, gain, filter };
}

export function createStaticCrackle(): CrackleNodes | null {
  const ctx = AudioEngine.getContext();
  const sfxGain = AudioEngine.getSfxGain();

  if (!ctx || !sfxGain) return null;

  const duration = 1;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  const clickCount = 2 + Math.floor(Math.random() * 3);
  const clickPositions: number[] = [];
  for (let i = 0; i < clickCount; i++) {
    clickPositions.push(Math.random());
  }

  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    let sample = 0;
    for (const pos of clickPositions) {
      const clickTime = pos * duration;
      const dist = Math.abs(t - clickTime);
      if (dist < 0.005) {
        const envelope = Math.exp(-dist * 200);
        sample += (Math.random() * 2 - 1) * envelope * 0.5;
      }
    }
    data[i] = sample;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = 0.15;

  source.connect(gain);
  gain.connect(sfxGain);

  return { source, gain };
}

export function createFFREWScreech(): ScreechNodes | null {
  const ctx = AudioEngine.getContext();
  const sfxGain = AudioEngine.getSfxGain();

  if (!ctx || !sfxGain) return null;

  const duration = 0.4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    const noise = Math.random() * 2 - 1;
    const harsh = Math.sin(t * 2000 * Math.PI * 2) * 0.3;
    const envelope = Math.exp(-t * 5) * (1 - Math.exp(-t * 50));
    data[i] = (noise * 0.7 + harsh) * envelope * 0.4;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.value = 0.25;

  source.connect(gain);
  gain.connect(sfxGain);

  return { source, gain };
}

export interface VcrMotorNodes {
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
}

export function createVcrMotorHum(): VcrMotorNodes | null {
  const ctx = AudioEngine.getContext();
  const ambientGain = AudioEngine.getAmbientGain();

  if (!ctx || !ambientGain) return null;

  const duration = 2;
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const bandpass60 = Math.sin(t * 60 * Math.PI * 2) * 0.3;
    const noise60 = (Math.random() - 0.5) * 0.2;
    const sine120 = Math.sin(t * 120 * Math.PI * 2) * 0.15;
    const mod = 1 + 0.05 * Math.sin(t * 3.7);
    data[i] = (bandpass60 + noise60 * mod + sine120) * 0.2;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 90;
  filter.Q.value = 2;

  const gain = ctx.createGain();
  gain.gain.value = 0.08;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ambientGain);

  return { source, gain, filter };
}

export interface AmbientDroneNodes {
  noiseSource: AudioBufferSourceNode;
  sineSource: AudioBufferSourceNode;
  ventilationSource: AudioBufferSourceNode;
  masterGain: GainNode;
}

export function createAmbientDrone(): AmbientDroneNodes | null {
  const ctx = AudioEngine.getContext();
  const ambientGain = AudioEngine.getAmbientGain();

  if (!ctx || !ambientGain) return null;

  const duration = 4;
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;

  const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = (Math.random() - 0.5) * 0.15;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 200;

  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.05;

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);

  const sineBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const sineData = sineBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const base = Math.sin(t * 40 * Math.PI * 2) * 0.4;
    const harmonics = Math.sin(t * 80 * Math.PI * 2) * 0.1 + Math.sin(t * 20 * Math.PI * 2) * 0.15;
    sineData[i] = (base + harmonics) * 0.3;
  }

  const sineSource = ctx.createBufferSource();
  sineSource.buffer = sineBuffer;
  sineSource.loop = true;

  const sineGain = ctx.createGain();
  sineGain.gain.value = 0.03;

  sineSource.connect(sineGain);

  const ventilationBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const ventilationData = ventilationBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const rumble = (Math.random() - 0.5) * 0.1;
    const woosh = Math.sin(t * 0.5 * Math.PI * 2) * 0.05;
    ventilationData[i] = (rumble + woosh) * 0.5;
  }

  const ventilationSource = ctx.createBufferSource();
  ventilationSource.buffer = ventilationBuffer;
  ventilationSource.loop = true;

  const ventilationFilter = ctx.createBiquadFilter();
  ventilationFilter.type = 'lowpass';
  ventilationFilter.frequency.value = 100;

  const ventilationGain = ctx.createGain();
  ventilationGain.gain.value = 0.02;

  ventilationSource.connect(ventilationFilter);
  ventilationFilter.connect(ventilationGain);

  const masterGain = ctx.createGain();
  masterGain.gain.value = 1;

  noiseGain.connect(masterGain);
  sineGain.connect(masterGain);
  ventilationGain.connect(masterGain);
  masterGain.connect(ambientGain);

  return {
    noiseSource,
    sineSource,
    ventilationSource,
    masterGain,
  };
}

export interface FFRewWhirNodes {
  oscillator: OscillatorNode;
  noiseSource: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
}

export function createFFWhir(): FFRewWhirNodes | null {
  const ctx = AudioEngine.getContext();
  const sfxGain = AudioEngine.getSfxGain();

  if (!ctx || !sfxGain) return null;

  const duration = 2;
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;

  const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const noise = (Math.random() - 0.5) * 0.3;
    const mod = 0.5 + 0.5 * Math.sin(t * 8 * Math.PI * 2);
    noiseData[i] = noise * mod * 0.5;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const oscillator = ctx.createOscillator();
  oscillator.type = 'sawtooth';
  oscillator.frequency.value = 80;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 200;
  filter.Q.value = 2;

  const gain = ctx.createGain();
  gain.gain.value = 0.08;

  noiseSource.connect(filter);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);

  return { oscillator, noiseSource, gain, filter };
}

export function createREWWhir(): FFRewWhirNodes | null {
  const ctx = AudioEngine.getContext();
  const sfxGain = AudioEngine.getSfxGain();

  if (!ctx || !sfxGain) return null;

  const duration = 2;
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;

  const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const noise = (Math.random() - 0.5) * 0.35;
    const mod = 0.5 + 0.5 * Math.sin(t * 6 * Math.PI * 2);
    const reversed = t < duration / 2 ? 1 : -1;
    noiseData[i] = noise * mod * 0.5 * reversed;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const oscillator = ctx.createOscillator();
  oscillator.type = 'sawtooth';
  oscillator.frequency.value = 60;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 150;
  filter.Q.value = 3;

  const gain = ctx.createGain();
  gain.gain.value = 0.06;

  noiseSource.connect(filter);
  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);

  return { oscillator, noiseSource, gain, filter };
}

export function modulateFFPitch(nodes: FFRewWhirNodes | null, progress: number): void {
  if (!nodes) return;
  const freq = 80 + progress * 120;
  nodes.oscillator.frequency.value = freq;
  nodes.filter.frequency.value = 200 + progress * 300;
  nodes.gain.gain.value = 0.06 + progress * 0.06;
}

export function modulateREWPitch(nodes: FFRewWhirNodes | null, progress: number): void {
  if (!nodes) return;
  const freq = 60 + progress * 40;
  nodes.oscillator.frequency.value = freq;
  nodes.filter.frequency.value = 150 + progress * 100;
  nodes.gain.gain.value = 0.05 + progress * 0.04;
}

export function createFluorescentBuzz(): { source: AudioBufferSourceNode; gain: GainNode } | null {
  const ctx = AudioEngine.getContext();
  const ambientGain = AudioEngine.getAmbientGain();

  if (!ctx || !ambientGain) return null;

  const duration = 2;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate;
    const base = Math.sin(t * 120 * Math.PI * 2) * 0.3;
    const harmonic = Math.sin(t * 240 * Math.PI * 2) * 0.1;
    const noise = (Math.random() - 0.5) * 0.1;
    const flicker = 1 + 0.02 * Math.sin(t * 17 * Math.PI * 2);
    data[i] = (base + harmonic + noise) * flicker * 0.3;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = 0.12;

  source.connect(gain);
  gain.connect(ambientGain);

  return { source, gain };
}

export function createTvStaticBurst(): void {
  const ctx = AudioEngine.getContext();
  const sfxGain = AudioEngine.getSfxGain();

  if (!ctx || !sfxGain) return;

  const now = ctx.currentTime;
  const duration = 0.8;

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    const t = i / ctx.sampleRate;
    const envelope = Math.exp(-t * 4) * (1 - Math.exp(-t * 20));
    noiseData[i] = (Math.random() * 2 - 1) * envelope * 0.6;
  }

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);

  source.start(now);
  source.stop(now + duration);

  const whineOsc = ctx.createOscillator();
  whineOsc.type = 'sine';
  whineOsc.frequency.setValueAtTime(15625, now);
  whineOsc.frequency.exponentialRampToValueAtTime(1000, now + 0.5);

  const whineGain = ctx.createGain();
  whineGain.gain.setValueAtTime(0.05, now);
  whineGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  whineOsc.connect(whineGain);
  whineGain.connect(sfxGain);

  whineOsc.start(now);
  whineOsc.stop(now + 0.5);
}

export function createTapeLoadingSound(): void {
  const ctx = AudioEngine.getContext();
  const sfxGain = AudioEngine.getSfxGain();

  if (!ctx || !sfxGain) return;

  const now = ctx.currentTime;
  const duration = 1.5;

  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    const motor = Math.sin(t * 60 * Math.PI * 2) * 0.15;
    const click = Math.random() > 0.995 ? (Math.random() - 0.5) * 0.5 : 0;
    const hiss = (Math.random() - 0.5) * 0.08;
    const envelope = Math.min(t * 5, 1) * Math.min((duration - t) * 2, 1);
    data[i] = (motor + click + hiss) * envelope;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 500;
  filter.Q.value = 1;

  const gain = ctx.createGain();
  gain.gain.value = 0.3;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);

  source.start(now);
  source.stop(now + duration);
}
