import { IS_DEBUG } from '@/debug/isDebug';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getTimelineEngine } from './TimelineEngine';
import { type HorrorPhase, type TimelineEvent, useHorrorStore } from './horrorStore';

const PHASE_COLORS: Record<HorrorPhase, string> = {
  DORMANT: '#22c55e',
  UNEASY: '#eab308',
  ESCALATING: '#f97316',
  CLIMAX: '#ef4444',
  POST: '#7f1d1d',
};

const EVENT_COLORS = {
  pending: '#6b7280',
  active: '#eab308',
  completed: '#22c55e',
};

interface TimelineVisualizerProps {
  visible?: boolean;
  height?: number;
  totalDuration?: number;
}

export function TimelineVisualizer({
  visible = true,
  height = 80,
  totalDuration = 60,
}: TimelineVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(visible);

  const phase = useHorrorStore((state) => state.phase);
  const intensity = useHorrorStore((state) => state.intensity);
  const totalTime = useHorrorStore((state) => state.totalTime);
  const activeEvents = useHorrorStore((state) => state.activeEvents);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === '`') {
        setIsVisible((v) => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  if (!isVisible) return null;

  const playheadPosition = (totalTime / totalDuration) * 100;

  const events = useMemo(() => {
    const engine = getTimelineEngine();
    if (engine) {
      return engine.getScheduledEvents();
    }
    return activeEvents;
  }, [activeEvents]);

  const getEventStatus = (event: TimelineEvent): 'pending' | 'active' | 'completed' => {
    if (event.isComplete) return 'completed';
    if (totalTime >= event.time && totalTime < event.time + event.duration) return 'active';
    return 'pending';
  };

  const handleEventClick = (event: TimelineEvent) => {
    if (IS_DEBUG) {
      const engine = getTimelineEngine();
      if (engine) {
        engine.seek(event.time);
        console.log('[TimelineVisualizer] Seek to event:', event.id, 'at time:', event.time);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderTop: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 16px',
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#fff',
        zIndex: 10000,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span>
          Phase: <span style={{ color: PHASE_COLORS[phase] }}>{phase}</span> | Intensity:{' '}
          {(intensity * 100).toFixed(0)}% | Time: {totalTime.toFixed(1)}s
        </span>
        <span style={{ opacity: 0.5 }}>Shift+` to toggle | Click events to seek</span>
      </div>

      <div style={{ flex: 1, position: 'relative', backgroundColor: '#1a1a1a', borderRadius: 4 }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          {(['DORMANT', 'UNEASY', 'ESCALATING', 'CLIMAX', 'POST'] as HorrorPhase[]).map(
            (p, index) => {
              const phaseWidths = [60, 60, 60, 30, 60];
              const totalWidth = phaseWidths.reduce((a, b) => a + b, 0);
              const width = (phaseWidths[index] / totalWidth) * 100;
              const isActive = p === phase;
              return (
                <div
                  key={p}
                  style={{
                    width: `${width}%`,
                    height: '100%',
                    backgroundColor: PHASE_COLORS[p],
                    opacity: isActive ? 0.4 : 0.15,
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    transition: 'opacity 0.3s',
                  }}
                  title={p}
                />
              );
            }
          )}
        </div>

        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <polyline
            points={`${Math.max(0, playheadPosition - 10)}%,${(1 - intensity) * 100}% ${playheadPosition}%,${(1 - intensity) * 100}%`}
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={2}
          />
        </svg>

        {events.map((event) => {
          const left = (event.time / totalDuration) * 100;
          const status = getEventStatus(event);
          const width = Math.max(2, (event.duration / totalDuration) * 100);

          return (
            <div
              key={event.id}
              onClick={() => handleEventClick(event)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEventClick(event);
              }}
              tabIndex={0}
              role="button"
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: '50%',
                transform: 'translateY(-50%)',
                width: `${width}%`,
                minWidth: 8,
                height: 16,
                backgroundColor: EVENT_COLORS[status],
                borderRadius: 2,
                cursor: 'pointer',
                border: status === 'active' ? '2px solid #fff' : 'none',
              }}
              title={`Event @ ${event.time}s (${status})`}
            />
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: `${Math.min(playheadPosition, 100)}%`,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: '#fff',
            boxShadow: '0 0 8px rgba(255,255,255,0.5)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: `${Math.min(playheadPosition, 95)}%`,
            top: -2,
            transform: 'translateY(-100%)',
            fontSize: 10,
            color: '#fff',
            whiteSpace: 'nowrap',
          }}
        >
          {totalTime.toFixed(1)}s
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 4, opacity: 0.7 }}>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              backgroundColor: EVENT_COLORS.pending,
              marginRight: 4,
            }}
          />
          Pending
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              backgroundColor: EVENT_COLORS.active,
              marginRight: 4,
            }}
          />
          Active
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              backgroundColor: EVENT_COLORS.completed,
              marginRight: 4,
            }}
          />
          Completed
        </span>
      </div>
    </div>
  );
}
