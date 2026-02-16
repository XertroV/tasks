import type { Vector2 } from 'three';

export interface LinkLayout {
  id: string;
  href: string;
  label: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PageLayout {
  links: LinkLayout[];
  screenWidth: number;
  screenHeight: number;
}

export interface UVHitResult {
  hit: boolean;
  linkId?: string;
  href?: string;
  label?: string;
}

export function findLinkAtUV(uv: Vector2, links: LinkLayout[], layout: PageLayout): UVHitResult {
  const screenX = (uv.x + 1) * 0.5 * layout.screenWidth;
  const screenY = (1 - uv.y) * 0.5 * layout.screenHeight;

  for (const link of links) {
    const { bounds } = link;
    if (
      screenX >= bounds.x &&
      screenX <= bounds.x + bounds.width &&
      screenY >= bounds.y &&
      screenY <= bounds.y + bounds.height
    ) {
      return {
        hit: true,
        linkId: link.id,
        href: link.href,
        label: link.label,
      };
    }
  }

  return { hit: false };
}

export function calculateLinkBounds(
  text: string,
  fontSize: number,
  startX: number,
  startY: number,
  lineHeight = 1.2
) {
  const charWidth = fontSize * 0.6;
  const width = text.length * charWidth;
  const height = fontSize * lineHeight;

  return {
    x: startX,
    y: startY,
    width,
    height,
  };
}
