import type { ParsedLine, ParsedPage, ParsedSection } from '@/content/mdxParser';
import { ShootableTarget } from '@/lightgun';
import { useNavigationStore } from '@/stores/navigationStore';
import { Text } from '@react-three/drei';
import type { GroupProps } from '@react-three/fiber';
import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useScrollController } from './useScrollController';

const CYAN = '#00ffff';
const AMBER = '#ffaa00';
const GREEN = '#33ff33';
const WHITE = '#ffffff';
const DISABLED_COLOR = '#666666';
const FONT_PATH = '/fonts/VT323-Regular.ttf';

const TITLE_Y = 0.82;
const CONTENT_START_Y = 0.68;
const LINE_HEIGHT = 0.045;
const FOOTER_Y = -0.82;
const SCROLL_BUTTON_Y = -0.65;

interface FooterNavigationProps {
  pageNumber: number;
  totalPages: number;
  showMenu: boolean;
  canScrollDown: boolean;
  onScrollDown: () => void;
  onScrollTop: () => void;
}

function FooterNavigation({
  pageNumber,
  totalPages,
  showMenu,
  canScrollDown,
  onScrollDown,
  onScrollTop,
}: FooterNavigationProps) {
  const canGoBack = useNavigationStore((state) => state.canGoBack());
  const canGoForward = useNavigationStore((state) => state.canGoForward());
  const goBack = useNavigationStore((state) => state.goBack);
  const goForward = useNavigationStore((state) => state.goForward);
  const navigateTo = useNavigationStore((state) => state.navigateTo);

  const isFirstPage = pageNumber <= 1;
  const isLastPage = pageNumber >= totalPages;
  const prevEnabled = !isFirstPage && canGoBack;
  const nextEnabled = !isLastPage && canGoForward;

  return (
    <>
      <ShootableTarget
        targetId="nav-scroll-top"
        onShoot={() => {
          onScrollTop();
        }}
      >
        <Text
          position={[-0.35, SCROLL_BUTTON_Y, 0]}
          color={CYAN}
          fontSize={0.024}
          maxWidth={0.25}
          anchorX="center"
          anchorY="middle"
          font={FONT_PATH}
        >
          [TOP]
        </Text>
      </ShootableTarget>

      <ShootableTarget
        targetId="nav-more"
        onShoot={() => {
          if (canScrollDown) onScrollDown();
        }}
      >
        <Text
          position={[0.35, SCROLL_BUTTON_Y, 0]}
          color={canScrollDown ? CYAN : DISABLED_COLOR}
          fontSize={0.024}
          maxWidth={0.25}
          anchorX="center"
          anchorY="middle"
          font={FONT_PATH}
        >
          {canScrollDown ? '[MORE]' : '[END]'}
        </Text>
      </ShootableTarget>

      <ShootableTarget
        targetId="nav-prev"
        onShoot={() => {
          if (prevEnabled) goBack();
        }}
      >
        <Text
          position={[-0.75, 0, 0]}
          color={prevEnabled ? CYAN : DISABLED_COLOR}
          fontSize={0.028}
          maxWidth={0.4}
          anchorX="left"
          anchorY="middle"
          font={FONT_PATH}
        >
          {'< PREV'}
        </Text>
      </ShootableTarget>

      <Text
        position={[0, 0, 0]}
        color={AMBER}
        fontSize={0.025}
        maxWidth={0.4}
        anchorX="center"
        anchorY="middle"
        font={FONT_PATH}
      >
        {totalPages > 0 ? `${pageNumber} / ${totalPages}` : '-- / --'}
      </Text>

      <ShootableTarget
        targetId="nav-next"
        onShoot={() => {
          if (nextEnabled) goForward();
        }}
      >
        <Text
          position={[0.75, 0, 0]}
          color={nextEnabled ? CYAN : DISABLED_COLOR}
          fontSize={0.028}
          maxWidth={0.4}
          anchorX="right"
          anchorY="middle"
          font={FONT_PATH}
        >
          {'NEXT >'}
        </Text>
      </ShootableTarget>

      {showMenu && (
        <ShootableTarget
          targetId="nav-menu"
          onShoot={() => {
            navigateTo('menu');
          }}
        >
          <Text
            position={[0, -0.055, 0]}
            color={CYAN}
            fontSize={0.025}
            maxWidth={0.5}
            anchorX="center"
            anchorY="middle"
            font={FONT_PATH}
          >
            [MENU]
          </Text>
        </ShootableTarget>
      )}
    </>
  );
}

export interface PageViewProps extends GroupProps {
  page: ParsedPage | null;
  pageNumber?: number;
  totalPages?: number;
  showMenu?: boolean;
}

function renderLine(
  line: ParsedLine,
  y: number,
  key: string,
  onLinkClick?: (href: string) => void
) {
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

  const indent = '  '.repeat(line.indent ?? 0);
  const prefix = line.type === 'list-item' ? '* ' : '';
  const content = `${indent}${prefix}${line.content}`;

  if (line.type === 'link' && line.href && onLinkClick) {
    return (
      <ShootableTarget
        key={key}
        targetId={`link-${key}`}
        onShoot={() => {
          if (line.href) onLinkClick(line.href);
        }}
      >
        <Text
          position={[-0.82, y, 0.005]}
          color={color}
          fontSize={fontSize}
          maxWidth={1.65}
          anchorX="left"
          anchorY="top"
          font={FONT_PATH}
        >
          {content}
        </Text>
      </ShootableTarget>
    );
  }

  return (
    <Text
      key={key}
      position={[-0.82, y, 0]}
      color={color}
      fontSize={fontSize}
      maxWidth={1.65}
      anchorX="left"
      anchorY="top"
      font={FONT_PATH}
    >
      {content}
    </Text>
  );
}

function renderSection(
  section: ParsedSection,
  startY: number,
  onLinkClick?: (href: string) => void
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
        font={FONT_PATH}
      >
        {section.heading}
      </Text>
    );
    y -= LINE_HEIGHT * 1.4;
  }

  for (let i = 0; i < section.lines.length; i++) {
    const line = section.lines[i];
    if (line.type !== 'blank') {
      const rendered = renderLine(line, y, `line-${y}-${i}`, onLinkClick);
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
  const { scrollOffset, scrollDown, scrollTop, canScrollDown } = useScrollController();
  const navigateTo = useNavigationStore((state) => state.navigateTo);

  const handleLinkClick = useCallback(
    (href: string) => {
      if (href.startsWith('/')) {
        const pageId = href.slice(1) || 'index';
        navigateTo(pageId);
      }
    },
    [navigateTo]
  );

  const contentElements = useMemo((): ReactElement[] => {
    if (!page) {
      return [];
    }

    const allElements: ReactElement[] = [];
    let y = CONTENT_START_Y + scrollOffset;

    for (let i = 0; i < page.sections.length; i++) {
      const section = page.sections[i];
      const { elements, nextY } = renderSection(section, y, handleLinkClick);
      allElements.push(...elements);
      y = nextY;

      if (y < FOOTER_Y + LINE_HEIGHT * 3) {
        break;
      }
    }

    return allElements;
  }, [page, scrollOffset, handleLinkClick]);

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
          font={FONT_PATH}
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
        font={FONT_PATH}
      >
        {page.title}
      </Text>

      {contentElements}

      <group position={[0, FOOTER_Y, 0]}>
        <FooterNavigation
          pageNumber={pageNumber}
          totalPages={totalPages}
          showMenu={showMenu}
          canScrollDown={canScrollDown}
          onScrollDown={scrollDown}
          onScrollTop={scrollTop}
        />
      </group>
    </group>
  );
}
