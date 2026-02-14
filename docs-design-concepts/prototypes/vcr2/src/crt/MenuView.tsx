import manifest from 'virtual:tape-manifest';
import type { TapeManifestEntry } from '@/types/content';
import { Text } from '@react-three/drei';
import type { GroupProps } from '@react-three/fiber';
import { useMemo } from 'react';

const CYAN = '#00ffff';
const AMBER = '#ffaa00';
const GREEN = '#33ff33';
const LINE_HEIGHT = 0.065;
const MAX_VISIBLE_LINES = 20;
const SCROLL_OFFSET_Y = 0.8;

export interface MenuViewProps extends GroupProps {
  scrollOffset?: number;
  selectedId?: string | null;
}

function groupBySection(entries: TapeManifestEntry[]): Map<string, TapeManifestEntry[]> {
  const sections = new Map<string, TapeManifestEntry[]>();

  for (const entry of entries) {
    const existing = sections.get(entry.section) ?? [];
    existing.push(entry);
    sections.set(entry.section, existing);
  }

  return sections;
}

function formatSectionTitle(section: string): string {
  if (section === 'index') {
    return 'HOME';
  }

  return section
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function MenuView({ scrollOffset = 0, selectedId = null, ...groupProps }: MenuViewProps) {
  const sections = useMemo(() => groupBySection(manifest), []);
  const lines: { text: string; color: string; y: number; id?: string }[] = useMemo(() => {
    const result: { text: string; color: string; y: number; id?: string }[] = [];
    let y = SCROLL_OFFSET_Y;

    for (const [section, entries] of sections) {
      result.push({
        text: `// ${formatSectionTitle(section)}`,
        color: AMBER,
        y,
      });
      y -= LINE_HEIGHT * 1.2;

      for (const entry of entries) {
        const indent = '  ';
        const prefix = entry.id === selectedId ? '> ' : '  ';
        result.push({
          text: `${indent}${prefix}${entry.title}`,
          color: entry.id === selectedId ? GREEN : CYAN,
          y,
          id: entry.id,
        });
        y -= LINE_HEIGHT;
      }

      y -= LINE_HEIGHT * 0.5;
    }

    return result;
  }, [sections, selectedId]);

  const visibleLines = useMemo(() => {
    const startLine = Math.floor(scrollOffset);
    return lines.slice(startLine, startLine + MAX_VISIBLE_LINES);
  }, [lines, scrollOffset]);

  return (
    <group {...groupProps}>
      <Text
        position={[0, 0.92, 0]}
        color={GREEN}
        fontSize={0.045}
        maxWidth={1.8}
        anchorX="center"
        anchorY="top"
      >
        THE BACKLOGS {'//'} DOCUMENTATION
      </Text>

      {visibleLines.map((line, index) => (
        <Text
          key={`${line.y}-${index}`}
          position={[-0.85, line.y, 0]}
          color={line.color}
          fontSize={0.035}
          maxWidth={1.7}
          anchorX="left"
          anchorY="top"
        >
          {line.text}
        </Text>
      ))}

      <Text
        position={[0, -0.85, 0]}
        color={AMBER}
        fontSize={0.028}
        maxWidth={1.8}
        anchorX="center"
        anchorY="bottom"
      >
        {[
          `SCROLL: ${Math.floor(scrollOffset)}/${Math.max(0, lines.length - MAX_VISIBLE_LINES)}`,
        ].join(' ')}
      </Text>
    </group>
  );
}
