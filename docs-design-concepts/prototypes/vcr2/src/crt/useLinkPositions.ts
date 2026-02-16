import type { ParsedPage } from '@/types/content';
import { useMemo } from 'react';

export interface LinkPosition {
  id: string;
  label: string;
  targetId: string;
  uvMin: { u: number; v: number };
  uvMax: { u: number; v: number };
  center: { u: number; v: number };
}

const LINE_HEIGHT = 0.045;
const CONTENT_START_Y = 0.68;
const LEFT_MARGIN = -0.82;
const CHAR_WIDTH_APPROX = 0.018;
const SCREEN_WIDTH = 2;
const SCREEN_HEIGHT = 2;
const SCREEN_CENTER_X = 0;
const SCREEN_CENTER_Y = 0;

function screenToUV(x: number, y: number): { u: number; v: number } {
  const u = (x - (SCREEN_CENTER_X - SCREEN_WIDTH / 2)) / SCREEN_WIDTH;
  const v = 1 - (y - (SCREEN_CENTER_Y - SCREEN_HEIGHT / 2)) / SCREEN_HEIGHT;
  return { u, v };
}

function computeLinkBounds(
  content: string,
  x: number,
  y: number,
  fontSize: number
): { min: { u: number; v: number }; max: { u: number; v: number } } {
  const charCount = content.length;
  const width = charCount * CHAR_WIDTH_APPROX * (fontSize / 0.032);
  const height = LINE_HEIGHT;

  const minX = x;
  const maxX = x + width;
  const minY = y - height;
  const maxY = y;

  const min = screenToUV(minX, minY);
  const max = screenToUV(maxX, maxY);

  return { min, max };
}

export function useLinkPositions(page: ParsedPage | null, scrollOffset = 0) {
  return useMemo(() => {
    if (!page) return [];

    const positions = [];
    let y = CONTENT_START_Y + scrollOffset;

    for (const section of page.sections) {
      if (section.heading) {
        y -= LINE_HEIGHT * 1.4;
      }

      for (let i = 0; i < section.lines.length; i++) {
        const line = section.lines[i];

        if (line.type === 'link' && line.linkTarget) {
          const indent = '  '.repeat(line.indent ?? 0);
          const content = `${indent}${line.content}`;
          const fontSize = 0.032;

          const bounds = computeLinkBounds(content, LEFT_MARGIN, y, fontSize);
          const linkId = `link-${y.toFixed(3)}-${i}`;

          positions.push({
            id: linkId,
            label: line.content,
            targetId: line.linkTarget,
            uvMin: bounds.min,
            uvMax: bounds.max,
            center: {
              u: (bounds.min.u + bounds.max.u) / 2,
              v: (bounds.min.v + bounds.max.v) / 2,
            },
          });
        }

        if (line.type !== 'blank') {
          y -= LINE_HEIGHT;
        }
      }

      y -= LINE_HEIGHT * 0.3;
    }

    return positions;
  }, [page, scrollOffset]);
}
