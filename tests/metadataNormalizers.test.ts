import { describe, it, expect } from 'vitest';
import { normalizeString, normalizeArray, normalizeMetadata } from '../utils/metadataNormalizers';

describe('normalizeString', () => {
  it('returns valid string unchanged', () => {
    expect(normalizeString('hello')).toBe('hello');
  });

  it('returns empty string for null', () => {
    expect(normalizeString(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(normalizeString(undefined)).toBe('');
  });

  it('returns empty string for "None"', () => {
    expect(normalizeString('None')).toBe('');
  });

  it('returns empty string for "none"', () => {
    expect(normalizeString('none')).toBe('');
  });

  it('returns empty string for number', () => {
    expect(normalizeString(123)).toBe('');
  });

  it('returns empty string for object', () => {
    expect(normalizeString({})).toBe('');
  });

  it('returns empty string for boolean', () => {
    expect(normalizeString(true)).toBe('');
  });

  it('returns empty string unchanged', () => {
    expect(normalizeString('')).toBe('');
  });

  it('preserves whitespace string', () => {
    expect(normalizeString('  ')).toBe('  ');
  });
});

describe('normalizeArray', () => {
  it('returns valid array unchanged', () => {
    expect(normalizeArray(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('returns empty array for null', () => {
    expect(normalizeArray(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(normalizeArray(undefined)).toEqual([]);
  });

  it('returns empty array for non-array value', () => {
    expect(normalizeArray('string')).toEqual([]);
  });

  it('filters null values from array', () => {
    expect(normalizeArray(['a', null, 'b'])).toEqual(['a', 'b']);
  });

  it('filters "None" values from array', () => {
    expect(normalizeArray(['a', 'None', 'b'])).toEqual(['a', 'b']);
  });

  it('filters "none" values from array', () => {
    expect(normalizeArray(['a', 'none', 'b'])).toEqual(['a', 'b']);
  });

  it('converts numbers to strings', () => {
    expect(normalizeArray([1, 2, 3])).toEqual(['1', '2', '3']);
  });

  it('handles mixed array correctly', () => {
    expect(normalizeArray(['a', null, 1, 'None'])).toEqual(['a', '1']);
  });

  it('returns empty array unchanged', () => {
    expect(normalizeArray([])).toEqual([]);
  });
});

describe('normalizeMetadata', () => {
  it('normalizes complete valid input', () => {
    const input = {
      meta: { intent: 'test', aspect_ratio: '16:9', quality: 'high' },
      subject: { archetype: 'hero', description: 'brave', expression: 'determined', pose: 'standing', attire: 'armor' },
      scene: { setting: 'battlefield', atmosphere: 'intense', elements: ['smoke', 'fire'] },
      technical: { shot: 'wide', lens: '24mm', lighting: 'dramatic', render: 'cinematic' },
      palette: { colors: ['red', 'orange'], mood: 'warm' },
      details: { textures: ['metal', 'leather'], accents: ['gold', 'silver'] },
      negative: 'blurry',
      text_content: { overlay: 'TITLE', style: 'bold' },
    };

    const result = normalizeMetadata(input);

    expect(result.meta.intent).toBe('test');
    expect(result.meta.aspect_ratio).toBe('16:9');
    expect(result.subject.archetype).toBe('hero');
    expect(result.scene.elements).toEqual(['smoke', 'fire']);
    expect(result.palette.colors).toEqual(['red', 'orange']);
    expect(result.negative).toBe('blurry');
  });

  it('fills empty strings for missing/null values', () => {
    const input = {
      meta: { intent: null, aspect_ratio: undefined, quality: 'None' },
      subject: {},
      scene: {},
      technical: {},
      palette: {},
      details: {},
      text_content: {},
    };

    const result = normalizeMetadata(input);

    expect(result.meta.intent).toBe('');
    expect(result.meta.aspect_ratio).toBe('');
    expect(result.meta.quality).toBe('');
    expect(result.subject.archetype).toBe('');
    expect(result.subject.description).toBe('');
  });

  it('fills empty arrays for missing/null array values', () => {
    const input = {
      meta: {},
      subject: {},
      scene: { elements: null },
      technical: {},
      palette: { colors: undefined },
      details: { textures: 'not-an-array' },
      text_content: {},
    };

    const result = normalizeMetadata(input);

    expect(result.scene.elements).toEqual([]);
    expect(result.palette.colors).toEqual([]);
    expect(result.details.textures).toEqual([]);
  });

  it('handles completely empty input', () => {
    const result = normalizeMetadata({});

    expect(result.meta.intent).toBe('');
    expect(result.subject.archetype).toBe('');
    expect(result.scene.elements).toEqual([]);
    expect(result.palette.colors).toEqual([]);
  });

  it('normalizes nested None values', () => {
    const input = {
      meta: { intent: 'None' },
      subject: { archetype: 'none' },
      scene: { elements: ['valid', 'None', 'none'] },
      technical: {},
      palette: {},
      details: {},
      text_content: {},
    };

    const result = normalizeMetadata(input);

    expect(result.meta.intent).toBe('');
    expect(result.subject.archetype).toBe('');
    expect(result.scene.elements).toEqual(['valid']);
  });
});
