import type { ParsedLine } from '@/types/content';
import { Text } from '@react-three/drei';
import type { GroupProps } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import type { ReactElement } from 'react';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { ZONES, Z_ORDER } from './OffscreenBackground';

const CYAN = '#00ffff';
const AMBER = '#ffaa00';
const GREEN = '#33ff33';
const WHITE = '#ffffff';

const CHAR_SIZE = 0.04;
const LINE_HEIGHT_MULT = 1.4;
const LEFT_MARGIN = -0.9;
const MAX_VISIBLE_LINES = 20;
const LINE_HEIGHT = CHAR_SIZE * LINE_HEIGHT_MULT;

export interface TextLayoutProps extends GroupProps {
  lines: ParsedLine[];
  scrollOffset?: number;
  showMoreIndicator?: boolean;
}

interface LineRender {
  element: ReactElement;
  y: number;
  height: number;
}

function renderLine(line: ParsedLine, y: number, key: string): LineRender | null {
  if (line.type === 'blank') {
    return null;
  }

  let color = GREEN;
  let fontSize = CHAR_SIZE;

  switch (line.type) {
    case 'heading':
      color = GREEN;
      fontSize = CHAR_SIZE * 1.2;
      break;
    case 'code':
      color = AMBER;
      fontSize = CHAR_SIZE * 0.9;
      break;
    case 'link':
      color = CYAN;
      fontSize = CHAR_SIZE;
      break;
    case 'list-item':
      color = WHITE;
      fontSize = CHAR_SIZE;
      break;
  }

  const indent = '  '.repeat(line.indent);
  const prefix = line.type === 'list-item' ? '▸ ' : '';
  const content = `${indent}${prefix}${line.content}`;

  const element = (
    <Text
      key={key}
      position={[LEFT_MARGIN, y, 0]}
      color={color}
      fontSize={fontSize}
      maxWidth={1.8}
      anchorX="left"
      anchorY="top"
      font="/fonts/VT323-Regular.ttf"
    >
      {content}
    </Text>
  );

  return { element, y, height: LINE_HEIGHT };
}

export function TextLayout({
  lines,
  scrollOffset = 0,
  showMoreIndicator = true,
  ...groupProps
}: TextLayoutProps) {
  const groupRef = useRef<THREE.Group>(null);
  const currentOffset = useRef(0);
  const targetOffset = useRef(scrollOffset);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    targetOffset.current = scrollOffset;

    const lerpFactor = 1 - 0.001 ** delta;
    currentOffset.current += (targetOffset.current - currentOffset.current) * lerpFactor;

    groupRef.current.position.y = currentOffset.current;
  });

  const renderedLines = useMemo((): LineRender[] => {
    const result: LineRender[] = [];
    let y = ZONES.content.yMax - LINE_HEIGHT;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const rendered = renderLine(line, y, `line-${i}`);
      if (rendered) {
        result.push(rendered);
        y -= LINE_HEIGHT;
      }
    }

    return result;
  }, [lines]);

  const totalHeight = renderedLines.length * LINE_HEIGHT;
  const visibleHeight = MAX_VISIBLE_LINES * LINE_HEIGHT;
  const maxScroll = Math.max(0, totalHeight - visibleHeight);
  const clampedScroll = Math.min(Math.max(0, scrollOffset), maxScroll);

  const visibleLines = useMemo(() => {
    const startLine = Math.floor(clampedScroll / LINE_HEIGHT);
    const endLine = startLine + MAX_VISIBLE_LINES + 1;
    return renderedLines.slice(startLine, endLine);
  }, [renderedLines, clampedScroll]);

  const showMore =
    showMoreIndicator && totalHeight > visibleHeight && clampedScroll < maxScroll - 0.1;
  const showTop = showMoreIndicator && clampedScroll > 0.1;

  return (
    <group {...groupProps}>
      <group ref={groupRef} position={[0, 0, 0]}>
        {visibleLines.map((line) => line.element)}
      </group>

      {showMore && (
        <Text
          position={[0.9, ZONES.content.yMin + 0.05, Z_ORDER.content + 0.05]}
          color={AMBER}
          fontSize={0.03}
          anchorX="right"
          anchorY="bottom"
        >
          ▼ MORE
        </Text>
      )}

      {showTop && (
        <Text
          position={[0.9, ZONES.content.yMax - 0.05, Z_ORDER.content + 0.05]}
          color={AMBER}
          fontSize={0.03}
          anchorX="right"
          anchorY="top"
        >
          ▲ TOP
        </Text>
      )}
    </group>
  );
}

export { LINE_HEIGHT, MAX_VISIBLE_LINES };
