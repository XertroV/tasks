import { useEffect, useRef } from 'react';
import type { HorrorState, TimelineEvent } from './horrorStore';
import { useHorrorStore } from './horrorStore';

let globalEngineInstance: TimelineEngine | null = null;

export function getTimelineEngine(): TimelineEngine | null {
  return globalEngineInstance;
}

export interface TimelineEngineState {
  isPaused: boolean;
  currentTime: number;
  lastTickTime: number;
  scheduledEvents: TimelineEvent[];
  activeRepeatedEvents: Map<string, number>;
  onEventTrigger?: (event: TimelineEvent) => void;
  onEventComplete?: (event: TimelineEvent) => void;
}

export interface TimelineEngineConfig {
  onEventTrigger?: (event: TimelineEvent) => void;
  onEventComplete?: (event: TimelineEvent) => void;
  defaultEvents?: TimelineEvent[];
}

function applyTimeVariance(time: number, variance: number | undefined, seed: number): number {
  if (!variance) return time;
  const random = ((seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  return time + (random - 0.5) * 2 * variance;
}

export class TimelineEngine {
  private state: TimelineEngineState;
  private frameId: number | null = null;
  private seedCounter = 0;

  constructor(config: TimelineEngineConfig = {}) {
    this.state = {
      isPaused: false,
      currentTime: 0,
      lastTickTime: performance.now() / 1000,
      scheduledEvents: config.defaultEvents ?? [],
      activeRepeatedEvents: new Map(),
      onEventTrigger: config.onEventTrigger,
      onEventComplete: config.onEventComplete,
    };
  }

  start(): void {
    if (this.frameId !== null) return;

    globalEngineInstance = this;
    this.state.isPaused = false;
    this.state.lastTickTime = performance.now() / 1000;
    this.tick();
  }

  pause(): void {
    this.state.isPaused = true;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  resume(): void {
    if (!this.state.isPaused) return;

    this.state.isPaused = false;
    this.state.lastTickTime = performance.now() / 1000;
    this.tick();
  }

  reset(): void {
    for (const event of this.state.scheduledEvents) {
      if (!event.isComplete && this.state.onEventComplete && event.cleanup) {
        event.cleanup();
      }
    }

    useHorrorStore.getState().reset();

    this.state.currentTime = 0;
    this.state.lastTickTime = performance.now() / 1000;
    this.state.scheduledEvents = this.state.scheduledEvents.map((e) => ({
      ...e,
      isComplete: false,
    }));
    this.state.activeRepeatedEvents.clear();

    if (!this.state.isPaused) {
      this.start();
    }
  }

  seek(targetTime: number): void {
    const previousTime = this.state.currentTime;
    this.state.currentTime = targetTime;

    for (const event of this.state.scheduledEvents) {
      if (event.isComplete) continue;

      const triggerTime = event.time;

      if (triggerTime <= targetTime && triggerTime > previousTime) {
        if (this.state.onEventTrigger) {
          this.state.onEventTrigger(event);
        }
        event.action(useHorrorStore.getState());
        useHorrorStore.getState().addEvent(event);

        if (triggerTime + event.duration <= targetTime) {
          event.isComplete = true;
          if (this.state.onEventComplete) {
            this.state.onEventComplete(event);
          }
          useHorrorStore.getState().removeEvent(event.id);
        }
      } else if (triggerTime + event.duration <= targetTime && !event.isComplete) {
        event.isComplete = true;
        if (this.state.onEventComplete) {
          this.state.onEventComplete(event);
        }
        useHorrorStore.getState().removeEvent(event.id);
      }
    }
  }

  getState(): TimelineEngineState & { storeState: HorrorState } {
    return {
      ...this.state,
      storeState: useHorrorStore.getState(),
    };
  }

  addEvent(event: TimelineEvent): void {
    this.state.scheduledEvents.push(event);
    this.state.scheduledEvents.sort((a, b) => a.time - b.time);
  }

  removeEvent(id: string): void {
    const index = this.state.scheduledEvents.findIndex((e) => e.id === id);
    if (index >= 0) {
      const event = this.state.scheduledEvents[index];
      if (!event.isComplete && event.cleanup) {
        event.cleanup();
      }
      this.state.scheduledEvents.splice(index, 1);
    }
    useHorrorStore.getState().removeEvent(id);
  }

  private tick = (): void => {
    if (this.state.isPaused) return;

    const now = performance.now() / 1000;
    const delta = now - this.state.lastTickTime;
    this.state.lastTickTime = now;
    this.state.currentTime += delta;

    useHorrorStore.getState().tick(delta);

    this.processEvents();

    this.frameId = requestAnimationFrame(this.tick);
  };

  private processEvents(): void {
    const currentTime = this.state.currentTime;
    const storeState = useHorrorStore.getState();

    const sortedEvents = [...this.state.scheduledEvents].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
    );

    for (const event of sortedEvents) {
      if (event.isComplete) continue;

      const eventTime = applyTimeVariance(event.time, event.timeVariance, this.seedCounter++);
      const repeatKey = event.id;
      const lastTriggerTime =
        this.state.activeRepeatedEvents.get(repeatKey) ?? Number.NEGATIVE_INFINITY;

      let shouldTrigger = false;

      if (event.repeat) {
        const { interval, count, intervalVariance } = event.repeat;
        const repeatCount = this.state.activeRepeatedEvents.has(repeatKey)
          ? Math.floor((currentTime - eventTime) / interval) + 1
          : 0;

        if (count !== undefined && repeatCount >= count) {
          event.isComplete = true;
          continue;
        }

        const nextTrigger = eventTime + repeatCount * interval;
        const intervalWithVariance = intervalVariance
          ? applyTimeVariance(nextTrigger, intervalVariance, this.seedCounter++)
          : nextTrigger;

        if (currentTime >= intervalWithVariance && lastTriggerTime < intervalWithVariance) {
          shouldTrigger = true;
        }
      } else {
        if (currentTime >= eventTime && lastTriggerTime < eventTime) {
          shouldTrigger = true;
        }
      }

      if (shouldTrigger) {
        if (event.condition && !event.condition(storeState)) {
          continue;
        }

        if (this.state.onEventTrigger) {
          this.state.onEventTrigger(event);
        }

        event.action(storeState);
        this.state.activeRepeatedEvents.set(repeatKey, currentTime);

        if (!event.repeat) {
          useHorrorStore.getState().addEvent(event);
        }
      }

      if (!event.repeat) {
        const endTime = eventTime + event.duration;
        if (currentTime >= endTime && !event.isComplete) {
          event.isComplete = true;
          if (this.state.onEventComplete) {
            this.state.onEventComplete(event);
          }
          if (event.cleanup) {
            event.cleanup();
          }
          useHorrorStore.getState().removeEvent(event.id);
        }
      }
    }
  }

  dispose(): void {
    this.pause();
    this.state.scheduledEvents = [];
    this.state.activeRepeatedEvents.clear();
    if (globalEngineInstance === this) {
      globalEngineInstance = null;
    }
  }

  getScheduledEvents(): TimelineEvent[] {
    return this.state.scheduledEvents;
  }
}

export function useTimelineEngine(config: TimelineEngineConfig = {}): TimelineEngine {
  const engineRef = useRef<TimelineEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new TimelineEngine(config);
  }

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, []);

  return engineRef.current;
}
