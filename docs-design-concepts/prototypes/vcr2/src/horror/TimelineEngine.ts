import { useEffect, useRef } from 'react';
import { useHorrorStore, type TimelineEvent } from './horrorStore';

export interface TimelineEngineState {
  isPaused: boolean;
  currentTime: number;
  lastTickTime: number;
  scheduledEvents: TimelineEvent[];
  onEventTrigger?: (event: TimelineEvent) => void;
  onEventComplete?: (event: TimelineEvent) => void;
}

export interface TimelineEngineConfig {
  onEventTrigger?: (event: TimelineEvent) => void;
  onEventComplete?: (event: TimelineEvent) => void;
  defaultEvents?: TimelineEvent[];
}

export class TimelineEngine {
  private state: TimelineEngineState;
  private frameId: number | null = null;

  constructor(config: TimelineEngineConfig = {}) {
    this.state = {
      isPaused: false,
      currentTime: 0,
      lastTickTime: performance.now() / 1000,
      scheduledEvents: config.defaultEvents ?? [],
      onEventTrigger: config.onEventTrigger,
      onEventComplete: config.onEventComplete,
    };
  }

  /**
   * Start the timeline engine
   */
  start(): void {
    if (this.frameId !== null) return;

    this.state.isPaused = false;
    this.state.lastTickTime = performance.now() / 1000;
    this.tick();
  }

  /**
   * Pause the timeline engine
   */
  pause(): void {
    this.state.isPaused = true;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  /**
   * Resume from paused state
   */
  resume(): void {
    if (!this.state.isPaused) return;

    this.state.isPaused = false;
    this.state.lastTickTime = performance.now() / 1000;
    this.tick();
  }

  /**
   * Reset the engine to initial state, calling cleanup on all active events
   */
  reset(): void {
    // Call cleanup on all active events
    for (const event of this.state.scheduledEvents) {
      if (!event.isComplete && this.state.onEventComplete) {
        this.state.onEventComplete(event);
      }
    }

    // Reset horror store
    useHorrorStore.getState().reset();

    // Reset engine state
    this.state.currentTime = 0;
    this.state.lastTickTime = performance.now() / 1000;
    this.state.scheduledEvents = this.state.scheduledEvents.map((e) => ({
      ...e,
      isComplete: false,
    }));

    // Restart if not paused
    if (!this.state.isPaused) {
      this.start();
    }
  }

  /**
   * Seek to a specific time, handling fast-forward and triggering/cleaning events
   */
  seek(targetTime: number): void {
    const previousTime = this.state.currentTime;
    this.state.currentTime = targetTime;

    // Process events between previous time and target time
    for (const event of this.state.scheduledEvents) {
      if (event.isComplete) continue;

      // Event should have triggered
      if (event.triggerTime <= targetTime && event.triggerTime > previousTime) {
        // Trigger the event
        if (this.state.onEventTrigger) {
          this.state.onEventTrigger(event);
        }

        // Add to active events in store
        useHorrorStore.getState().addEvent(event);

        // Check if event should have completed
        if (event.triggerTime + event.duration <= targetTime) {
          event.isComplete = true;
          if (this.state.onEventComplete) {
            this.state.onEventComplete(event);
          }
          useHorrorStore.getState().removeEvent(event.id);
        }
      } else if (event.triggerTime + event.duration <= targetTime && !event.isComplete) {
        // Event should have completed
        event.isComplete = true;
        if (this.state.onEventComplete) {
          this.state.onEventComplete(event);
        }
        useHorrorStore.getState().removeEvent(event.id);
      }
    }
  }

  /**
   * Get current engine state snapshot
   */
  getState(): TimelineEngineState & { storeState: ReturnType<typeof useHorrorStore.getState> } {
    return {
      ...this.state,
      storeState: useHorrorStore.getState(),
    };
  }

  /**
   * Add a new event to the timeline
   */
  addEvent(event: TimelineEvent): void {
    this.state.scheduledEvents.push(event);
    // Sort by trigger time
    this.state.scheduledEvents.sort((a, b) => a.triggerTime - b.triggerTime);
  }

  /**
   * Remove an event from the timeline
   */
  removeEvent(id: string): void {
    const index = this.state.scheduledEvents.findIndex((e) => e.id === id);
    if (index >= 0) {
      const event = this.state.scheduledEvents[index];
      if (!event.isComplete && this.state.onEventComplete) {
        this.state.onEventComplete(event);
      }
      this.state.scheduledEvents.splice(index, 1);
    }
    useHorrorStore.getState().removeEvent(id);
  }

  /**
   * Core tick function - called every frame
   */
  private tick = (): void => {
    if (this.state.isPaused) return;

    const now = performance.now() / 1000;
    const delta = now - this.state.lastTickTime;
    this.state.lastTickTime = now;
    this.state.currentTime += delta;

    // Update elapsed time in store
    useHorrorStore.getState().updateElapsed(delta);

    // Interpolate intensity toward target
    const store = useHorrorStore.getState();
    const newIntensity = this.interpolateIntensity(
      store.intensity,
      store.targetIntensity,
      0.5,
      delta
    );
    useHorrorStore.getState().setIntensity(newIntensity);

    // Process scheduled events
    this.processEvents();

    // Continue ticking
    this.frameId = requestAnimationFrame(this.tick);
  };

  private processEvents(): void {
    const currentTime = this.state.currentTime;

    for (const event of this.state.scheduledEvents) {
      if (event.isComplete) continue;

      // Check if event should trigger
      if (
        event.triggerTime <= currentTime &&
        !useHorrorStore.getState().activeEvents.find((e) => e.id === event.id)
      ) {
        // Trigger the event
        if (this.state.onEventTrigger) {
          this.state.onEventTrigger(event);
        }
        useHorrorStore.getState().addEvent(event);
      }

      // Check if event should complete
      if (event.triggerTime + event.duration <= currentTime) {
        event.isComplete = true;
        if (this.state.onEventComplete) {
          this.state.onEventComplete(event);
        }
        useHorrorStore.getState().removeEvent(event.id);
      }
    }
  }

  private interpolateIntensity(
    current: number,
    target: number,
    speed: number,
    delta: number
  ): number {
    const diff = target - current;
    const change = diff * speed * delta;
    return current + change;
  }

  /**
   * Clean up the engine
   */
  dispose(): void {
    this.pause();
    this.state.scheduledEvents = [];
  }
}

/**
 * React hook for using TimelineEngine
 */
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
