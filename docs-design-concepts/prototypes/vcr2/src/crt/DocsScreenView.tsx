import { formatTimecode } from '@/stores/contentStore';
import type { ParsedPage } from '@/types/content';
import { useVCRStore } from '@/vcr';
import type { VCRMode } from '@/vcr/vcrStore';
import { useFrame } from '@react-three/fiber';
import type { GroupProps } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OffscreenBackground } from './OffscreenBackground';
import { TextLayout } from './TextLayout';
import { TitleArea } from './TitleArea';
import { VcrOSD } from './VcrOSD';
import { clampScroll } from './useScrollController';

export interface DocsScreenViewProps extends GroupProps {
  page: ParsedPage | null;
  scrollOffset?: number;
}

export function DocsScreenView({ page, scrollOffset = 0, ...groupProps }: DocsScreenViewProps) {
  const vcrMode = useVCRStore((state) => state.mode) as VCRMode;
  const currentTime = useVCRStore((state) => state.currentTime);
  const [currentScrollOffset, setCurrentScrollOffset] = useState(scrollOffset);
  const scrollRef = useRef(0);

  const lines = useMemo(() => {
    if (!page) return [];
    return page.sections.flatMap((section) => section.lines);
  }, [page]);

  useEffect(() => {
    scrollRef.current = scrollOffset;
  }, [scrollOffset]);

  useFrame(() => {
    if (scrollRef.current !== currentScrollOffset) {
      setCurrentScrollOffset(clampScroll(scrollRef.current, lines.length));
    }
  });

  const timecode = formatTimecode(currentTime);

  return (
    <group {...groupProps}>
      <OffscreenBackground />
      {page && <TitleArea title={page.title} />}
      <TextLayout lines={lines} scrollOffset={currentScrollOffset} />
      <VcrOSD mode={vcrMode} timecode={timecode} />
    </group>
  );
}
