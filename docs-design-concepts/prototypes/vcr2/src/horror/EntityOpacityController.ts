import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export interface EntityState {
  opacity: number;
  targetOpacity: number;
  intensity: number;
  targetIntensity: number;
  isActive: boolean;
}

export interface EntityAnimationConfig {
  flashDuration: number; // 0.1s
  flashHoldTime: number; // time to hold at peak
  fadeOutDuration: number; // 0.3s
  buildDuration: number; // 2s
  toggleOffDuration: number; // 1s
}

const DEFAULT_CONFIG: EntityAnimationConfig = {
  flashDuration: 0.1,
  flashHoldTime: 0.05,
  fadeOutDuration: 0.3,
  buildDuration: 2.0,
  toggleOffDuration: 1.0,
};

export type AnimationPattern = 'none' | 'flash' | 'build' | 'fade-out';

export class EntityOpacityController {
  private state: EntityState;
  private config: EntityAnimationConfig;
  private currentPattern = 'none' as AnimationPattern;
  private patternTime = 0;

  constructor(config: Partial<EntityAnimationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      opacity: 0,
      targetOpacity: 0,
      intensity: 0,
      targetIntensity: 0,
      isActive: false,
    };
  }

  /**
   * Trigger flash pattern: opacity spike in <0.1s, hold, fade in <0.3s
   */
  flash(intensity = 1.0): void {
    this.state.targetOpacity = intensity;
    this.state.targetIntensity = intensity;
    this.currentPattern = 'flash';
    this.patternTime = 0;
    this.state.isActive = true;
  }

  /**
   * Trigger build pattern: slow ramp from 0 to target over ~2s
   */
  build(targetIntensity = 1.0): void {
    this.state.targetOpacity = targetIntensity;
    this.state.targetIntensity = targetIntensity;
    this.currentPattern = 'build';
    this.patternTime = 0;
    this.state.isActive = true;
  }

  /**
   * Toggle off: all values lerp to 0 over 1s
   */
  fadeOut(): void {
    this.state.targetOpacity = 0;
    this.state.targetIntensity = 0;
    this.currentPattern = 'fade-out';
    this.patternTime = 0;
  }

  /**
   * Set target values directly (for continuous control)
   */
  setTarget(opacity: number, intensity: number): void {
    this.state.targetOpacity = opacity;
    this.state.targetIntensity = intensity;
    if (opacity > 0 || intensity > 0) {
      this.state.isActive = true;
    }
  }

  /**
   * Get current state
   */
  getState(): EntityState {
    return { ...this.state };
  }

  /**
   * Check if entity is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Update animation - call this every frame
   */
  update(deltaTime: number): void {
    if (this.currentPattern === 'none') {
      // Smooth interpolation when no pattern active
      this.interpolateToTarget(deltaTime, 2.0);
      return;
    }

    this.patternTime += deltaTime;

    switch (this.currentPattern) {
      case 'flash':
        this.updateFlashPattern();
        if (this.isPatternComplete()) {
          this.currentPattern = 'none';
        }
        break;
      case 'build':
        this.updateBuildPattern();
        if (this.isPatternComplete()) {
          this.currentPattern = 'none';
        }
        break;
      case 'fade-out':
        this.updateFadeOutPattern();
        if (this.isPatternComplete()) {
          this.state.isActive = false;
          this.currentPattern = 'none';
        }
        break;
    }
  }

  private updateFlashPattern(): void {
    const { flashDuration, flashHoldTime, fadeOutDuration } = this.config;
    const totalTime = flashDuration + flashHoldTime + fadeOutDuration;
    const t = this.patternTime;

    if (t < flashDuration) {
      // Spike up
      const progress = t / flashDuration;
      this.state.opacity = this.easeOutQuad(progress) * this.state.targetOpacity;
      this.state.intensity = this.state.opacity;
    } else if (t < flashDuration + flashHoldTime) {
      // Hold at peak
      this.state.opacity = this.state.targetOpacity;
      this.state.intensity = this.state.targetIntensity;
    } else if (t < totalTime) {
      // Fade out
      const fadeProgress = (t - flashDuration - flashHoldTime) / fadeOutDuration;
      this.state.opacity = (1 - this.easeInQuad(fadeProgress)) * this.state.targetOpacity;
      this.state.intensity = this.state.opacity;
    }
  }

  private updateBuildPattern(): void {
    const { buildDuration } = this.config;
    const t = this.patternTime;

    if (t < buildDuration) {
      // Slow ramp up
      const progress = t / buildDuration;
      this.state.opacity = this.easeInOutQuad(progress) * this.state.targetOpacity;
      this.state.intensity = this.state.opacity;
    }
  }

  private updateFadeOutPattern(): void {
    const { toggleOffDuration } = this.config;
    const t = this.patternTime;

    if (t < toggleOffDuration) {
      const progress = t / toggleOffDuration;
      // Decay from current to 0
      this.state.opacity = (1 - this.easeInQuad(progress)) * this.state.opacity;
      this.state.intensity = this.state.opacity;
    } else {
      this.state.opacity = 0;
      this.state.intensity = 0;
    }
  }

  private interpolateToTarget(deltaTime: number, speed: number): void {
    const lerpFactor = 1 - Math.exp(-speed * deltaTime);

    this.state.opacity += (this.state.targetOpacity - this.state.opacity) * lerpFactor;
    this.state.intensity += (this.state.targetIntensity - this.state.intensity) * lerpFactor;

    // Snap to target when close
    if (Math.abs(this.state.opacity - this.state.targetOpacity) < 0.001) {
      this.state.opacity = this.state.targetOpacity;
    }
    if (Math.abs(this.state.intensity - this.state.targetIntensity) < 0.001) {
      this.state.intensity = this.state.targetIntensity;
    }
  }

  private isPatternComplete(): boolean {
    switch (this.currentPattern) {
      case 'flash':
        return (
          this.patternTime >=
          this.config.flashDuration + this.config.flashHoldTime + this.config.fadeOutDuration
        );
      case 'build':
        return this.patternTime >= this.config.buildDuration;
      case 'fade-out':
        return this.patternTime >= this.config.toggleOffDuration;
      default:
        return true;
    }
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  private easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  }
}

/**
 * React hook for using EntityOpacityController
 */
export function useEntityOpacityController(config: Partial<EntityAnimationConfig> = {}) {
  const controllerRef = useRef<EntityOpacityController | null>(null);
  const lastTimeRef = useRef(0);

  if (!controllerRef.current) {
    controllerRef.current = new EntityOpacityController(config);
  }

  useFrame(() => {
    const now = performance.now() / 1000;
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    if (controllerRef.current) {
      controllerRef.current.update(delta);
    }
  });

  return controllerRef.current;
}
