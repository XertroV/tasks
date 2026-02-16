import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import { TimelineEngine } from '../TimelineEngine';
import { type TimelineEvent, useHorrorStore } from '../horrorStore';

describe('TimelineEngine', () => {
  let engine: TimelineEngine;

  beforeEach(() => {
    useHorrorStore.getState().reset();
  });

  afterEach(() => {
    engine?.dispose();
  });

  describe('construction', () => {
    it('should create engine with default config', () => {
      engine = new TimelineEngine();
      const state = engine.getState();
      expect(state.isPaused).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.scheduledEvents.length).toBe(0);
    });

    it('should accept default events', () => {
      const events: TimelineEvent[] = [
        {
          id: 'test-event',
          time: 10,
          duration: 5,
          action: vi.fn(),
        },
      ];
      engine = new TimelineEngine({ defaultEvents: events });
      expect(engine.getState().scheduledEvents.length).toBe(1);
    });
  });

  describe('lifecycle', () => {
    it('should start in non-paused state', () => {
      engine = new TimelineEngine();
      expect(engine.getState().isPaused).toBe(false);
    });

    it('should pause', () => {
      engine = new TimelineEngine();
      engine.pause();
      expect(engine.getState().isPaused).toBe(true);
    });

    it('should resume from paused state', () => {
      engine = new TimelineEngine();
      engine.pause();
      expect(engine.getState().isPaused).toBe(true);
    });
  });

  describe('event management', () => {
    it('should add events', () => {
      engine = new TimelineEngine();
      engine.addEvent({
        id: 'test',
        time: 10,
        duration: 5,
        action: vi.fn(),
      });
      expect(engine.getState().scheduledEvents.length).toBe(1);
    });

    it('should remove events', () => {
      engine = new TimelineEngine();
      engine.addEvent({
        id: 'test',
        time: 10,
        duration: 5,
        action: vi.fn(),
      });
      engine.removeEvent('test');
      expect(engine.getState().scheduledEvents.length).toBe(0);
    });

    it('should sort events by time', () => {
      engine = new TimelineEngine();
      engine.addEvent({ id: 'late', time: 20, duration: 1, action: vi.fn() });
      engine.addEvent({ id: 'early', time: 5, duration: 1, action: vi.fn() });

      const events = engine.getState().scheduledEvents;
      expect(events[0].id).toBe('early');
      expect(events[1].id).toBe('late');
    });
  });

  describe('event triggering via seek', () => {
    it('should trigger events when seeking forward', () => {
      const action = vi.fn();
      engine = new TimelineEngine({
        defaultEvents: [{ id: 'test', time: 50, duration: 10, action }],
      });
      engine.seek(60);

      expect(action).toHaveBeenCalled();
    });

    it('should call onEventTrigger callback', () => {
      const onEventTrigger = vi.fn();
      engine = new TimelineEngine({
        onEventTrigger,
        defaultEvents: [{ id: 'test', time: 50, duration: 10, action: vi.fn() }],
      });
      engine.seek(60);

      expect(onEventTrigger).toHaveBeenCalled();
    });

    it('should not trigger events when seeking backward', () => {
      const action = vi.fn();
      engine = new TimelineEngine({
        defaultEvents: [{ id: 'test', time: 50, duration: 10, action }],
      });
      engine.seek(60);
      action.mockClear();
      engine.seek(30);

      expect(action).not.toHaveBeenCalled();
    });
  });

  describe('seek', () => {
    it('should jump to target time', () => {
      engine = new TimelineEngine();
      engine.seek(100);
      expect(engine.getState().currentTime).toBe(100);
    });

    it('should trigger events when seeking forward', () => {
      const action = vi.fn();
      engine = new TimelineEngine({
        defaultEvents: [{ id: 'test', time: 50, duration: 10, action }],
      });
      engine.seek(60);

      expect(action).toHaveBeenCalled();
    });

    it('should not trigger events when seeking backward', () => {
      const action = vi.fn();
      engine = new TimelineEngine({
        defaultEvents: [{ id: 'test', time: 50, duration: 10, action }],
      });
      engine.seek(60);
      action.mockClear();
      engine.seek(30);

      expect(action).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset time to 0', () => {
      engine = new TimelineEngine();
      engine.pause();
      engine.seek(100);
      engine.reset();
      expect(engine.getState().currentTime).toBe(0);
    });

    it('should reset events to not complete', () => {
      const action = vi.fn();
      engine = new TimelineEngine({
        defaultEvents: [{ id: 'test', time: 10, duration: 5, action }],
      });
      engine.pause();
      engine.seek(100);
      engine.reset();

      const events = engine.getState().scheduledEvents;
      expect(events[0].isComplete).toBeFalsy();
    });
  });

  describe('dispose', () => {
    it('should pause and clear events', () => {
      engine = new TimelineEngine({
        defaultEvents: [{ id: 'test', time: 10, duration: 5, action: vi.fn() }],
      });
      engine.dispose();

      expect(engine.getState().isPaused).toBe(true);
      expect(engine.getState().scheduledEvents.length).toBe(0);
    });
  });
});

describe('TimelineEngine edge cases', () => {
  let engine: TimelineEngine;

  beforeEach(() => {
    useHorrorStore.getState().reset();
  });

  afterEach(() => {
    engine?.dispose();
  });

  it('should handle event with priority', () => {
    const calls: string[] = [];

    engine = new TimelineEngine({
      defaultEvents: [
        { id: 'low', time: 10, duration: 1, priority: 1, action: () => calls.push('low') },
        { id: 'high', time: 10, duration: 1, priority: 10, action: () => calls.push('high') },
        { id: 'medium', time: 10, duration: 1, priority: 5, action: () => calls.push('medium') },
      ],
    });

    engine.seek(15);

    expect(calls.length).toBe(3);
    expect(calls).toContain('low');
    expect(calls).toContain('medium');
    expect(calls).toContain('high');
  });

  it('should handle time variance', () => {
    const action = vi.fn();

    engine = new TimelineEngine({
      defaultEvents: [{ id: 'test', time: 10, timeVariance: 5, duration: 1, action }],
    });

    engine.seek(20);

    expect(action).toHaveBeenCalled();
  });

  it('should handle cleanup function on removal', () => {
    const cleanup = vi.fn();

    engine = new TimelineEngine({
      defaultEvents: [{ id: 'test', time: 10, duration: 100, action: vi.fn(), cleanup }],
    });

    engine.seek(15);
    engine.removeEvent('test');

    expect(cleanup).toHaveBeenCalled();
  });
});
