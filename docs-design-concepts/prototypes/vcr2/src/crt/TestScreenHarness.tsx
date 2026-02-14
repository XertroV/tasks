import type { GroupProps } from '@react-three/fiber';
import { useState, useEffect } from 'react';
import type { ParsedLine } from '@/types/content';
import { TextLayout } from './TextLayout';
import { TitleArea } from './TitleArea';
import { VcrOSD } from './VcrOSD';
import { OffscreenBackground } from './OffscreenBackground';
import { clampScroll } from './useScrollController';

const SAMPLE_LINES: ParsedLine[] = [
  { type: 'heading', content: 'Sample Documentation Page', indent: 0 },
  { type: 'blank', content: '', indent: 0 },
  { type: 'text', content: 'This is a test harness for the CRT screen renderer.', indent: 0 },
  { type: 'text', content: 'It exercises all text types to verify styling.', indent: 0 },
  { type: 'blank', content: '', indent: 0 },
  { type: 'heading', content: 'Code Examples', indent: 0 },
  { type: 'code', content: 'const greeting = "Hello, CRT!";', indent: 0 },
  { type: 'code', content: 'console.log(greeting);', indent: 0 },
  { type: 'code', content: '// This is a code comment', indent: 0 },
  { type: 'blank', content: '', indent: 0 },
  { type: 'heading', content: 'Navigation Links', indent: 0 },
  { type: 'link', content: 'Getting Started Guide', indent: 0, linkTarget: 'getting-started' },
  { type: 'link', content: 'Operations Reference', indent: 0, linkTarget: 'operations' },
  { type: 'link', content: 'API Documentation', indent: 0, linkTarget: 'api' },
  { type: 'blank', content: '', indent: 0 },
  { type: 'heading', content: 'List Items', indent: 0 },
  { type: 'list-item', content: 'First item in the list', indent: 0 },
  { type: 'list-item', content: 'Second item with more text', indent: 0 },
  { type: 'list-item', content: 'Third item demonstrates wrapping', indent: 0 },
  { type: 'list-item', content: 'Nested item example', indent: 1 },
  { type: 'list-item', content: 'Another nested item', indent: 1 },
  { type: 'list-item', content: 'Back to top level', indent: 0 },
  { type: 'blank', content: '', indent: 0 },
  { type: 'heading', content: 'Scroll Test Section', indent: 0 },
  { type: 'text', content: 'Line 1 of scroll test content', indent: 0 },
  { type: 'text', content: 'Line 2 of scroll test content', indent: 0 },
  { type: 'text', content: 'Line 3 of scroll test content', indent: 0 },
  { type: 'text', content: 'Line 4 of scroll test content', indent: 0 },
  { type: 'text', content: 'Line 5 of scroll test content', indent: 0 },
  { type: 'text', content: 'Line 6 of scroll test content', indent: 0 },
  { type: 'text', content: 'Line 7 of scroll test content', indent: 0 },
  { type: 'text', content: 'Line 8 of scroll test content', indent: 0 },
  { type: 'text', content: 'Line 9 of scroll test content', indent: 0 },
  { type: 'text', content: 'Line 10 of scroll test content', indent: 0 },
  { type: 'text', content: 'End of scroll test content', indent: 0 },
];

function useTestScreenMode(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get('test-screen') === 'true');
  }, []);

  return enabled;
}

export interface TestScreenHarnessProps extends GroupProps {
  forceEnable?: boolean;
}

export function TestScreenHarness({ forceEnable = false, ...groupProps }: TestScreenHarnessProps) {
  const urlEnabled = useTestScreenMode();
  const enabled = forceEnable || urlEnabled;
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const handleWheel = (e: WheelEvent) => {
      setScrollOffset((prev) => {
        const newOffset = prev + e.deltaY * 0.001;
        return clampScroll(newOffset, SAMPLE_LINES.length);
      });
    };

    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <group {...groupProps}>
      <OffscreenBackground />
      <TitleArea title="TEST HARNESS // CRT SCREEN" />
      <TextLayout lines={SAMPLE_LINES} scrollOffset={scrollOffset} />
      <VcrOSD mode="PLAYING" timecode="00:00:05:15" trackingError={0} />
    </group>
  );
}

export { useTestScreenMode };
