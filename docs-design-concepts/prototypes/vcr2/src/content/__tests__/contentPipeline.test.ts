import { describe, it, expect } from 'bun:test';
import { parseMdx } from '../mdxParser';
import { buildTapeModel, formatTimecode, parseTimecode, getPageAtPosition, getAdjacentPages } from '../tapeModel';
import type { TapeManifestEntry } from '../index';

const mockManifest: TapeManifestEntry[] = [
  { id: 'index', title: 'Home', section: 'index', order: 0, file: 'index.mdx' },
  { id: 'getting-started', title: 'Getting Started', section: 'getting-started', order: 1000, file: 'getting-started/intro.mdx' },
  { id: 'operations', title: 'Operations', section: 'operations', order: 2000, file: 'operations/index.mdx' },
];

const sampleMdx = `---
title: Test Page
---

import { Component } from 'react';

# Introduction

This is a **sample** paragraph with some text.

## Code Example

\`\`\`typescript
const x = 42;
console.log(x);
\`\`\`

### Links

Check out [Getting Started](./getting-started) for more info.

- Item one
- Item two
- Item three

| Name | Value |
|------|-------|
| A    | 1     |
| B    | 2     |

`;

describe('mdxParser', () => {
  it('parses MDX without errors', () => {
    const result = parseMdx(sampleMdx, mockManifest[0], mockManifest);
    expect(result.id).toBe('index');
    expect(result.title).toBe('Home');
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it('classifies headings correctly', () => {
    const result = parseMdx(sampleMdx, mockManifest[0], mockManifest);
    const headingLines = result.sections.flatMap((s) => s.lines.filter((l) => l.type === 'heading'));
    expect(headingLines.length).toBeGreaterThan(0);
  });

  it('classifies code blocks correctly', () => {
    const result = parseMdx(sampleMdx, mockManifest[0], mockManifest);
    const codeLines = result.sections.flatMap((s) => s.lines.filter((l) => l.type === 'code'));
    expect(codeLines.length).toBeGreaterThan(0);
    expect(codeLines.some((l) => l.content.includes('const'))).toBe(true);
  });

  it('resolves internal links', () => {
    const result = parseMdx(sampleMdx, mockManifest[0], mockManifest);
    expect(result.links).toContain('getting-started');
  });

  it('strips HTML/JSX tags', () => {
    const result = parseMdx(sampleMdx, mockManifest[0], mockManifest);
    const allContent = result.sections.flatMap((s) => s.lines.map((l) => l.content)).join(' ');
    expect(allContent).not.toContain('import');
    expect(allContent).not.toContain('Component');
  });

  it('handles lists correctly', () => {
    const result = parseMdx(sampleMdx, mockManifest[0], mockManifest);
    const listItems = result.sections.flatMap((s) => s.lines.filter((l) => l.type === 'list-item'));
    expect(listItems.length).toBeGreaterThanOrEqual(3);
  });

  it('handles tables as text', () => {
    const result = parseMdx(sampleMdx, mockManifest[0], mockManifest);
    const allContent = result.sections.flatMap((s) => s.lines.map((l) => l.content)).join(' ');
    expect(allContent).toContain('| Name |');
  });
});

describe('tapeModel', () => {
  const model = buildTapeModel(mockManifest);

  it('builds tape model with correct page count', () => {
    expect(model.pageCount).toBe(3);
    expect(model.pages.length).toBe(3);
  });

  it('calculates correct total duration', () => {
    expect(model.totalDuration).toBe(3 * 150);
  });

  it('formatTimecode returns correct format', () => {
    expect(formatTimecode(0)).toBe('00:00:00:00');
    expect(formatTimecode(7200)).toBe('02:00:00:00');
    expect(formatTimecode(150)).toBe('00:02:30:00');
  });

  it('parseTimecode reverses formatTimecode', () => {
    expect(parseTimecode('00:00:00:00')).toBe(0);
    expect(parseTimecode('02:00:00:00')).toBe(7200);
  });

  it('getPageAtPosition returns correct page', () => {
    const page0 = getPageAtPosition(model, 0);
    expect(page0?.id).toBe('index');

    const page1 = getPageAtPosition(model, 150);
    expect(page1?.id).toBe('getting-started');

    const page2 = getPageAtPosition(model, 299);
    expect(page2?.id).toBe('getting-started');
  });

  it('getPageAtPosition returns null for out of bounds', () => {
    expect(getPageAtPosition(model, -1)).toBeNull();
    expect(getPageAtPosition(model, 1000)).toBeNull();
  });

  it('getAdjacentPages returns correct siblings', () => {
    const firstAdjacent = getAdjacentPages(model, 'index');
    expect(firstAdjacent.prev).toBeNull();
    expect(firstAdjacent.next).toBe('getting-started');

    const middleAdjacent = getAdjacentPages(model, 'getting-started');
    expect(middleAdjacent.prev).toBe('index');
    expect(middleAdjacent.next).toBe('operations');

    const lastAdjacent = getAdjacentPages(model, 'operations');
    expect(lastAdjacent.prev).toBe('getting-started');
    expect(lastAdjacent.next).toBeNull();
  });

  it('tape positions are monotonically increasing', () => {
    for (let i = 1; i < model.pages.length; i++) {
      expect(model.pages[i].tapePosition).toBeGreaterThan(model.pages[i - 1].tapePosition);
    }
  });
});
