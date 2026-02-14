import { useCallback, useRef } from 'react';
import { LINE_HEIGHT, MAX_VISIBLE_LINES } from './TextLayout';

export interface ScrollController {
  scrollTo: (offset: number) => void;
  scrollBy: (delta: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  getOffset: () => number;
  getMaxScroll: (totalLines: number) => number;
}

export function useScrollController(
  initialOffset = 0
): [number, ScrollController, (offset: number) => void] {
  const offsetRef = useRef(initialOffset);
  const setOffsetRef = useRef<((offset: number) => void) | null>(null);

  const scrollTo = useCallback((newOffset: number) => {
    offsetRef.current = newOffset;
    setOffsetRef.current?.(newOffset);
  }, []);

  const scrollBy = useCallback((delta: number) => {
    offsetRef.current += delta;
    setOffsetRef.current?.(offsetRef.current);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollTo(0);
  }, [scrollTo]);

  const scrollToBottom = useCallback(() => {
    offsetRef.current = Number.POSITIVE_INFINITY;
    setOffsetRef.current?.(offsetRef.current);
  }, []);

  const getOffset = useCallback(() => offsetRef.current, []);

  const getMaxScroll = useCallback((totalLines: number) => {
    const totalHeight = totalLines * LINE_HEIGHT;
    const visibleHeight = MAX_VISIBLE_LINES * LINE_HEIGHT;
    return Math.max(0, totalHeight - visibleHeight);
  }, []);

  const controller: ScrollController = {
    scrollTo,
    scrollBy,
    scrollToTop,
    scrollToBottom,
    getOffset,
    getMaxScroll,
  };

  const setOffset = useCallback((offset: number) => {
    offsetRef.current = offset;
  }, []);

  return [offsetRef.current, controller, setOffset];
}

export function clampScroll(offset: number, totalLines: number): number {
  const totalHeight = totalLines * LINE_HEIGHT;
  const visibleHeight = MAX_VISIBLE_LINES * LINE_HEIGHT;
  const maxScroll = Math.max(0, totalHeight - visibleHeight);
  return Math.min(Math.max(0, offset), maxScroll);
}
