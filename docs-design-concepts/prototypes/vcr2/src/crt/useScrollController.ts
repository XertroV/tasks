import { useCallback, useState } from 'react';
import { LINE_HEIGHT, MAX_VISIBLE_LINES } from './TextLayout';

export interface ScrollController {
  scrollTo: (offset: number) => void;
  scrollBy: (delta: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  getOffset: () => number;
  getMaxScroll: (totalLines: number) => number;
}

export interface ScrollControllerResult {
  scrollOffset: number;
  controller: ScrollController;
  scrollDown: () => void;
  scrollTop: () => void;
  canScrollDown: boolean;
}

export function useScrollController(initialOffset = 0, totalLines = 100): ScrollControllerResult {
  const [scrollOffset, setScrollOffset] = useState(initialOffset);
  const maxScroll = (totalLines - MAX_VISIBLE_LINES) * LINE_HEIGHT;

  const scrollTo = useCallback(
    (newOffset: number) => {
      setScrollOffset(Math.max(0, Math.min(newOffset, maxScroll)));
    },
    [maxScroll]
  );

  const scrollBy = useCallback(
    (delta: number) => {
      setScrollOffset((prev) => Math.max(0, Math.min(prev + delta, maxScroll)));
    },
    [maxScroll]
  );

  const scrollToTop = useCallback(() => {
    setScrollOffset(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    setScrollOffset(maxScroll);
  }, [maxScroll]);

  const getOffset = useCallback(() => scrollOffset, [scrollOffset]);

  const getMaxScrollCb = useCallback((_totalLines: number) => {
    const totalHeight = _totalLines * LINE_HEIGHT;
    const visibleHeight = MAX_VISIBLE_LINES * LINE_HEIGHT;
    return Math.max(0, totalHeight - visibleHeight);
  }, []);

  const scrollDown = useCallback(() => {
    scrollBy(LINE_HEIGHT * 5);
  }, [scrollBy]);

  const scrollTop = useCallback(() => {
    scrollToTop();
  }, [scrollToTop]);

  const canScrollDown = scrollOffset < maxScroll;

  const controller: ScrollController = {
    scrollTo,
    scrollBy,
    scrollToTop,
    scrollToBottom,
    getOffset,
    getMaxScroll: getMaxScrollCb,
  };

  return {
    scrollOffset,
    controller,
    scrollDown,
    scrollTop,
    canScrollDown,
  };
}

export function clampScroll(offset: number, totalLines: number): number {
  const totalHeight = totalLines * LINE_HEIGHT;
  const visibleHeight = MAX_VISIBLE_LINES * LINE_HEIGHT;
  const maxScroll = Math.max(0, totalHeight - visibleHeight);
  return Math.min(Math.max(0, offset), maxScroll);
}
