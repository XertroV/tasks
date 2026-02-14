import type { ParsedLine, ParsedPage, ParsedSection } from '@/types/content';
import { Text } from '@react-three/drei';
import type { GroupProps } from '@react-three/fiber';
import { useMemo } from 'react';
import type { ReactElement } from 'react';

const CYAN = '#00ffff';
const AMBER = '#ffaa00';
const GREEN = '#33ff33';
const WHITE = '#ffffff';

const TITLE_Y = 0.82;
const CONTENT_START_Y = 0.68;
const LINE_HEIGHT = 0.045;
const FOOTER_Y = -0.82;

export interface PageViewProps extends GroupProps {
  page: ParsedPage | null;
  pageNumber?: number;
  totalPages?: number;
  showMenu?: boolean;
}

function renderLine(line: ParsedLine, y: number, key: string) {
  let color = WHITE;
  let fontSize = 0.032;

  switch (line.type) {
    case 'heading':
      color = GREEN;
      fontSize = 0.04;
      break;
    case 'code':
      color = AMBER;
      fontSize = 0.028;
      break;
    case 'link':
      color = CYAN;
      fontSize = 0.032;
      break;
    case 'list-item':
      color = WHITE;
      fontSize = 0.032;
      break;
    case 'blank':
      return null;
    default:
      break;
  }

  const indent = '  '.repeat(line.indent);
  const prefix = line.type === 'list-item' ? '* ' : '';
  const content = `${indent}${prefix}${line.content}`;

  return (
    <Text
      key={key}
      position={[-0.82, y, 0]}
      color={color}
      fontSize={fontSize}
      maxWidth={1.65}
      anchorX="left"
      anchorY="top"
    >
      {content}
    </Text>
  );
}

function renderSection(
  section: ParsedSection,
  startY: number
): { elements: ReactElement[]; nextY: number } {
  const elements: ReactElement[] = [];
  let y = startY;

  if (section.heading) {
    elements.push(
      <Text
        key={`heading-${y}`}
        position={[-0.82, y, 0]}
        color={GREEN}
        fontSize={0.038}
        maxWidth={1.65}
        anchorX="left"
        anchorY="top"
      >
        {section.heading}
      </Text>
    );
    y -= LINE_HEIGHT * 1.4;
  }

  for (let i = 0; i < section.lines.length; i++) {
    const line = section.lines[i];
    if (line.type !== 'blank') {
      const rendered = renderLine(line, y, `line-${y}-${i}`);
      if (rendered) {
        elements.push(rendered);
      }
    }
    y -= LINE_HEIGHT;
  }

  return { elements, nextY: y - LINE_HEIGHT * 0.3 };
}

export function PageView({
  page,
  pageNumber = 0,
  totalPages = 0,
  showMenu = true,
  ...groupProps
}: PageViewProps) {
  const contentElements = useMemo((): ReactElement[] => {
    if (!page) {
      return [];
    }

    const allElements: ReactElement[] = [];
    let y = CONTENT_START_Y;

    for (let i = 0; i < page.sections.length; i++) {
      const section = page.sections[i];
      const { elements, nextY } = renderSection(section, y);
      allElements.push(...elements);
      y = nextY;

      if (y < FOOTER_Y + LINE_HEIGHT * 3) {
        break;
      }
    }

    return allElements;
  }, [page]);

  if (!page) {
    return (
      <group {...groupProps}>
        <Text
          position={[0, 0, 0]}
          color={AMBER}
          fontSize={0.05}
          maxWidth={1.8}
          anchorX="center"
          anchorY="middle"
        >
          NO CONTENT LOADED
        </Text>
      </group>
    );
  }

  return (
    <group {...groupProps}>
      <Text
        position={[0, TITLE_Y, 0]}
        color={GREEN}
        fontSize={0.055}
        maxWidth={1.7}
        anchorX="center"
        anchorY="top"
      >
        {page.title}
      </Text>

      {contentElements}

      <group position={[0, FOOTER_Y, 0]}>
        <Text
          position={[-0.75, 0, 0]}
          color={CYAN}
          fontSize={0.028}
          maxWidth={0.4}
          anchorX="left"
          anchorY="middle"
        >
          {'< PREV'}
        </Text>

        <Text
          position={[0, 0, 0]}
          color={AMBER}
          fontSize={0.025}
          maxWidth={0.4}
          anchorX="center"
          anchorY="middle"
        >
          {totalPages > 0 ? `${pageNumber} / ${totalPages}` : '-- / --'}
        </Text>

        <Text
          position={[0.75, 0, 0]}
          color={CYAN}
          fontSize={0.028}
          maxWidth={0.4}
          anchorX="right"
          anchorY="middle"
        >
          {'NEXT >'}
        </Text>

        {showMenu && (
          <Text
            position={[0, -0.055, 0]}
            color={CYAN}
            fontSize={0.025}
            maxWidth={0.5}
            anchorX="center"
            anchorY="middle"
          >
            [MENU]
          </Text>
        )}
      </group>
    </group>
  );
}
