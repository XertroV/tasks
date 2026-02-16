import { beforeEach, describe, expect, it } from 'bun:test';
import {
  type HorrorPhase,
  PHASE_DURATIONS,
  calculateIntensity,
  easeInOutQuad,
  useHorrorStore,
} from '../horrorStore';

describe('horrorStore', () => {
  beforeEach(() => {
    useHorrorStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useHorrorStore.getState();
      expect(state.enabled).toBe(true);
      expect(state.phase).toBe('DORMANT');
      expect(state.intensity).toBe(0);
      expect(state.timeInPhase).toBe(0);
      expect(state.totalTime).toBe(0);
      expect(state.entityVisible).toBe(false);
      expect(state.entityIntensity).toBe(0);
      expect(state.disabling).toBe(false);
    });

    it('should have empty triggersActivated set', () => {
      const state = useHorrorStore.getState();
      expect(state.triggersActivated.size).toBe(0);
    });

    it('should have empty effectOverrides', () => {
      const state = useHorrorStore.getState();
      expect(Object.keys(state.effectOverrides).length).toBe(0);
    });
  });

  describe('enable/disable', () => {
    it('should disable horror system', () => {
      const store = useHorrorStore.getState();
      store.disable();

      const state = useHorrorStore.getState();
      expect(state.enabled).toBe(false);
      expect(state.phase).toBe('DORMANT');
      expect(state.intensity).toBe(0);
    });

    it('should enable horror system and reset to defaults', () => {
      const store = useHorrorStore.getState();
      store.tick(50);
      store.setPhase('UNEASY');

      store.disable();
      store.enable();

      const state = useHorrorStore.getState();
      expect(state.enabled).toBe(true);
      expect(state.phase).toBe('DORMANT');
      expect(state.totalTime).toBe(0);
    });

    it('should set disabling flag when disabling', () => {
      const store = useHorrorStore.getState();
      store.setEnabled(false);

      const state = useHorrorStore.getState();
      expect(state.disabling).toBe(true);
    });
  });

  describe('tick', () => {
    it('should increment totalTime', () => {
      const store = useHorrorStore.getState();
      store.tick(1);

      const state = useHorrorStore.getState();
      expect(state.totalTime).toBe(1);
    });

    it('should increment timeInPhase', () => {
      const store = useHorrorStore.getState();
      store.tick(5);

      const state = useHorrorStore.getState();
      expect(state.timeInPhase).toBe(5);
    });

    it('should not tick when disabled', () => {
      const store = useHorrorStore.getState();
      store.disable();
      store.tick(1);

      const state = useHorrorStore.getState();
      expect(state.totalTime).toBe(0);
    });

    it('should not tick when disabling', () => {
      const store = useHorrorStore.getState();
      store.setEnabled(false);
      store.tick(1);

      const state = useHorrorStore.getState();
      expect(state.totalTime).toBe(0);
    });
  });

  describe('intensity curve', () => {
    it('should be 0 at time 0', () => {
      expect(calculateIntensity(0)).toBe(0);
    });

    it('should be approximately 0.2 at 60s', () => {
      const intensity = calculateIntensity(60);
      expect(intensity).toBeGreaterThanOrEqual(0.15);
      expect(intensity).toBeLessThanOrEqual(0.25);
    });

    it('should be approximately 0.5 at 120s', () => {
      const intensity = calculateIntensity(120);
      expect(intensity).toBeGreaterThanOrEqual(0.45);
      expect(intensity).toBeLessThanOrEqual(0.55);
    });

    it('should be approximately 0.8 at 180s', () => {
      const intensity = calculateIntensity(180);
      expect(intensity).toBeGreaterThanOrEqual(0.75);
      expect(intensity).toBeLessThanOrEqual(0.85);
    });

    it('should be 1.0 at 195s+', () => {
      expect(calculateIntensity(195)).toBe(1.0);
      expect(calculateIntensity(210)).toBe(1.0);
      expect(calculateIntensity(300)).toBe(1.0);
    });

    it('should increase intensity over time via tick', () => {
      const store = useHorrorStore.getState();

      store.tick(60);
      const intensity1 = useHorrorStore.getState().intensity;
      expect(intensity1).toBeGreaterThan(0);

      store.tick(60);
      const intensity2 = useHorrorStore.getState().intensity;
      expect(intensity2).toBeGreaterThan(intensity1);
    });
  });

  describe('phase transitions', () => {
    it('should have correct phase durations', () => {
      expect(PHASE_DURATIONS.DORMANT).toBe(60);
      expect(PHASE_DURATIONS.UNEASY).toBe(60);
      expect(PHASE_DURATIONS.ESCALATING).toBe(60);
      expect(PHASE_DURATIONS.CLIMAX).toBe(30);
      expect(PHASE_DURATIONS.POST).toBe(Number.POSITIVE_INFINITY);
    });

    it('should transition from DORMANT to UNEASY after 60s', () => {
      const store = useHorrorStore.getState();
      store.tick(60);

      const state = useHorrorStore.getState();
      expect(state.phase).toBe('UNEASY');
      expect(state.timeInPhase).toBe(0);
    });

    it('should transition through all phases', () => {
      const store = useHorrorStore.getState();
      const phases: HorrorPhase[] = ['DORMANT', 'UNEASY', 'ESCALATING', 'CLIMAX', 'POST'];

      const durations = [60, 60, 60, 30];

      for (let i = 0; i < durations.length; i++) {
        expect(useHorrorStore.getState().phase).toBe(phases[i]);
        store.tick(durations[i]);
      }

      expect(useHorrorStore.getState().phase).toBe('POST');
    });

    it('should stay in POST phase', () => {
      const store = useHorrorStore.getState();
      store.tick(210);

      expect(useHorrorStore.getState().phase).toBe('POST');

      store.tick(100);
      expect(useHorrorStore.getState().phase).toBe('POST');
    });
  });

  describe('triggers', () => {
    it('should activate trigger', () => {
      const store = useHorrorStore.getState();
      store.activateTrigger('test-trigger');

      const state = useHorrorStore.getState();
      expect(state.triggersActivated.has('test-trigger')).toBe(true);
    });

    it('should not duplicate triggers', () => {
      const store = useHorrorStore.getState();
      store.activateTrigger('test-trigger');
      store.activateTrigger('test-trigger');

      const state = useHorrorStore.getState();
      expect(state.triggersActivated.size).toBe(1);
    });

    it('should record lastTriggerTime', () => {
      const store = useHorrorStore.getState();
      store.tick(10);
      store.activateTrigger('test-trigger');

      const state = useHorrorStore.getState();
      expect(state.lastTriggerTime).toBe(10);
    });
  });

  describe('entity controls', () => {
    it('should set entity visible', () => {
      const store = useHorrorStore.getState();
      store.setEntityVisible(true);

      expect(useHorrorStore.getState().entityVisible).toBe(true);
    });

    it('should set entity intensity', () => {
      const store = useHorrorStore.getState();
      store.setEntityIntensity(0.5);

      expect(useHorrorStore.getState().entityIntensity).toBe(0.5);
    });

    it('should clamp entity intensity to 0-1', () => {
      const store = useHorrorStore.getState();

      store.setEntityIntensity(1.5);
      expect(useHorrorStore.getState().entityIntensity).toBe(1);

      store.setEntityIntensity(-0.5);
      expect(useHorrorStore.getState().entityIntensity).toBe(0);
    });
  });

  describe('effect overrides', () => {
    it('should set effect overrides', () => {
      const store = useHorrorStore.getState();
      store.setEffectOverride({ noiseIntensity: 0.5 });

      const state = useHorrorStore.getState();
      expect(state.effectOverrides.noiseIntensity).toBe(0.5);
    });

    it('should merge effect overrides', () => {
      const store = useHorrorStore.getState();
      store.setEffectOverride({ noiseIntensity: 0.5 });
      store.setEffectOverride({ scanlineIntensity: 0.3 });

      const state = useHorrorStore.getState();
      expect(state.effectOverrides.noiseIntensity).toBe(0.5);
      expect(state.effectOverrides.scanlineIntensity).toBe(0.3);
    });

    it('should clear effect overrides', () => {
      const store = useHorrorStore.getState();
      store.setEffectOverride({ noiseIntensity: 0.5 });
      store.clearEffectOverrides();

      const state = useHorrorStore.getState();
      expect(Object.keys(state.effectOverrides).length).toBe(0);
    });
  });

  describe('toggle', () => {
    it('should toggle enabled state', () => {
      const store = useHorrorStore.getState();
      expect(store.enabled).toBe(true);

      store.toggleEnabled();

      expect(useHorrorStore.getState().disabling).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      const store = useHorrorStore.getState();

      store.tick(100);
      store.setPhase('ESCALATING');
      store.setEntityVisible(true);
      store.setEntityIntensity(0.8);
      store.setEffectOverride({ noiseIntensity: 0.5 });
      store.activateTrigger('test');

      store.reset();

      const state = useHorrorStore.getState();
      expect(state.enabled).toBe(true);
      expect(state.phase).toBe('DORMANT');
      expect(state.intensity).toBe(0);
      expect(state.timeInPhase).toBe(0);
      expect(state.totalTime).toBe(0);
      expect(state.triggersActivated.size).toBe(0);
      expect(state.entityVisible).toBe(false);
      expect(state.entityIntensity).toBe(0);
      expect(Object.keys(state.effectOverrides).length).toBe(0);
    });
  });
});

describe('easeInOutQuad', () => {
  it('should return 0 for input 0', () => {
    expect(easeInOutQuad(0)).toBe(0);
  });

  it('should return 1 for input 1', () => {
    expect(easeInOutQuad(1)).toBe(1);
  });

  it('should return 0.5 for input 0.5', () => {
    expect(easeInOutQuad(0.5)).toBe(0.5);
  });

  it('should be symmetric', () => {
    expect(easeInOutQuad(0.25)).toBeCloseTo(1 - easeInOutQuad(0.75), 10);
  });
});
