import { describe, expect, it } from 'bun:test';
import { ENTITY_MESSAGES, addZalgo, replaceWords } from '../corruption-effects';

describe('addZalgo', () => {
  it('should return original text at intensity 0', () => {
    const text = 'Hello World';
    const result = addZalgo(text, { intensity: 0 });
    expect(result).toBe(text);
  });

  it('should heavily corrupt text at intensity 1', () => {
    const text = 'Hello';
    const result = addZalgo(text, { intensity: 1, seed: 12345 });
    expect(result.length).toBeGreaterThan(text.length);
  });

  it('should not add zalgo to spaces', () => {
    const text = 'Hello World';
    const result = addZalgo(text, { intensity: 1, seed: 12345 });
    expect(result).toContain(' ');
  });

  it('should be deterministic with same seed', () => {
    const text = 'Hello';
    const result1 = addZalgo(text, { intensity: 0.5, seed: 12345 });
    const result2 = addZalgo(text, { intensity: 0.5, seed: 12345 });
    expect(result1).toBe(result2);
  });

  it('should produce different results with different seeds', () => {
    const text = 'Hello';
    const result1 = addZalgo(text, { intensity: 0.5, seed: 12345 });
    const result2 = addZalgo(text, { intensity: 0.5, seed: 67890 });
    expect(result1).not.toBe(result2);
  });

  it('should respect maxStack option', () => {
    const text = 'A';
    const lowStack = addZalgo(text, { intensity: 1, maxStack: 1, seed: 12345 });
    const highStack = addZalgo(text, { intensity: 1, maxStack: 20, seed: 12345 });
    expect(highStack.length).toBeGreaterThanOrEqual(lowStack.length);
  });
});

describe('replaceWords', () => {
  it('should return original text at intensity 0', () => {
    const text = 'The quick brown fox';
    const result = replaceWords(text, { intensity: 0 });
    expect(result).toBe(text);
  });

  it('should replace some words at intensity 1', () => {
    const text = 'something is watching';
    const result = replaceWords(text, { intensity: 1 });
    expect(result).not.toBe(text);
  });

  it('should only replace content words >= minLength', () => {
    const text = 'the quick fox';
    const result = replaceWords(text, { intensity: 1, minLength: 10 });
    expect(result).toBe(text);
  });

  it('should preserve capitalization', () => {
    const text = 'Something is watching';
    const result = replaceWords(text, { intensity: 1 });
    expect(result[0]).toBe(result[0].toUpperCase());
  });

  it('should not replace short words', () => {
    const text = 'a b c d e';
    const result = replaceWords(text, { intensity: 1, minLength: 5 });
    expect(result).toBe(text);
  });

  it('should preserve whitespace', () => {
    const text = 'hello   world';
    const result = replaceWords(text, { intensity: 1 });
    expect(result).toContain('   ');
  });
});

describe('ENTITY_MESSAGES', () => {
  it('should have wrongWords array', () => {
    expect(Array.isArray(ENTITY_MESSAGES.wrongWords)).toBe(true);
    expect(ENTITY_MESSAGES.wrongWords.length).toBeGreaterThan(0);
  });

  it('should have textReplacements object', () => {
    expect(typeof ENTITY_MESSAGES.textReplacements).toBe('object');
    expect(Object.keys(ENTITY_MESSAGES.textReplacements).length).toBeGreaterThan(0);
  });

  it('should have screenTakeover array', () => {
    expect(Array.isArray(ENTITY_MESSAGES.screenTakeover)).toBe(true);
    expect(ENTITY_MESSAGES.screenTakeover.length).toBeGreaterThan(0);
  });

  it('should have finalMessages array', () => {
    expect(Array.isArray(ENTITY_MESSAGES.finalMessages)).toBe(true);
    expect(ENTITY_MESSAGES.finalMessages.length).toBeGreaterThan(0);
  });

  it('should contain zalgo-corrupted text in screenTakeover', () => {
    const hasZalgo = ENTITY_MESSAGES.screenTakeover.some(
      (msg) => msg.length > 10 && /\p{M}/u.test(msg)
    );
    expect(hasZalgo).toBe(true);
  });

  it('should contain zalgo-corrupted text in finalMessages', () => {
    const hasZalgo = ENTITY_MESSAGES.finalMessages.some(
      (msg) => msg.length > 5 && /\p{M}/u.test(msg)
    );
    expect(hasZalgo).toBe(true);
  });
});
