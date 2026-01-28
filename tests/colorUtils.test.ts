import { describe, it, expect } from 'vitest';
import {
  hexToSimpleColorName,
  getColorModifier,
  formatColorWithModifier,
  formatColorPalette,
} from '../utils/colorUtils';

describe('hexToSimpleColorName', () => {
  it('identifies red colors', () => {
    expect(hexToSimpleColorName('#FF0000')).toBe('red');
    expect(hexToSimpleColorName('#CC0000')).toBe('red');
  });

  it('identifies blue colors', () => {
    expect(hexToSimpleColorName('#0000FF')).toBe('blue');
    expect(hexToSimpleColorName('#0000CC')).toBe('blue');
  });

  it('identifies green colors', () => {
    expect(hexToSimpleColorName('#008000')).toBe('green');
    expect(hexToSimpleColorName('#00FF00')).toBe('green');
  });

  it('identifies gold/yellow colors', () => {
    expect(hexToSimpleColorName('#FFD700')).toBe('gold');
    expect(hexToSimpleColorName('#FFFF00')).toBe('yellow');
  });

  it('identifies brown colors', () => {
    expect(hexToSimpleColorName('#8B4513')).toBe('brown');
  });

  it('identifies black and white', () => {
    expect(hexToSimpleColorName('#000000')).toBe('black');
    expect(hexToSimpleColorName('#FFFFFF')).toBe('white');
  });

  it('handles 3-digit hex codes', () => {
    expect(hexToSimpleColorName('#F00')).toBe('red');
    expect(hexToSimpleColorName('#00F')).toBe('blue');
  });

  it('handles hex codes without #', () => {
    expect(hexToSimpleColorName('FF0000')).toBe('red');
  });

  it('returns "unknown" for invalid hex', () => {
    expect(hexToSimpleColorName('invalid')).toBe('unknown');
    expect(hexToSimpleColorName('#GGG')).toBe('unknown');
  });
});

describe('getColorModifier', () => {
  it('returns "light" for light colors', () => {
    expect(getColorModifier('#FFFFFF')).toBe('light');
    expect(getColorModifier('#FFFFCC')).toBe('light');
    expect(getColorModifier('#CCCCCC')).toBe('light');
  });

  it('returns "dark" for dark colors', () => {
    expect(getColorModifier('#000000')).toBe('dark');
    expect(getColorModifier('#1a1a1a')).toBe('dark');
    expect(getColorModifier('#333333')).toBe('dark');
  });

  it('returns empty string for mid-tone colors', () => {
    expect(getColorModifier('#808080')).toBe('');
  });

  it('returns empty string for invalid hex', () => {
    expect(getColorModifier('invalid')).toBe('');
  });
});

describe('formatColorWithModifier', () => {
  it('formats light colors with "light" prefix', () => {
    const result = formatColorWithModifier('#FFB6C1'); // Light pink
    expect(result).toMatch(/^light \w+$/);
  });

  it('formats dark colors with "dark" prefix', () => {
    const result = formatColorWithModifier('#1a3a5c'); // Dark blue
    expect(result).toMatch(/^dark \w+$/);
  });

  it('does not add modifier to black', () => {
    expect(formatColorWithModifier('#000000')).toBe('black');
  });

  it('does not add modifier to white', () => {
    expect(formatColorWithModifier('#FFFFFF')).toBe('white');
  });

  it('formats mid-tone colors without modifier', () => {
    const result = formatColorWithModifier('#808080');
    expect(result).not.toContain('light');
    expect(result).not.toContain('dark');
  });
});

describe('formatColorPalette', () => {
  it('returns empty string for empty array', () => {
    expect(formatColorPalette([])).toBe('');
  });

  it('returns single formatted color for array with one color', () => {
    const result = formatColorPalette(['#FF0000']);
    expect(result).toContain('red');
  });

  it('formats two colors as "X and Y"', () => {
    const result = formatColorPalette(['#1a3a5c', '#FFD700']);
    expect(result).toMatch(/and/);
    // #1a3a5c maps to navy (closer than blue), #FFD700 maps to gold
    expect(result).toContain('navy');
    expect(result).toContain('gold');
  });

  it('only uses first two colors from array', () => {
    const result = formatColorPalette(['#FF0000', '#00FF00', '#0000FF']);
    // Should only include red and green, not blue
    expect(result).toContain('red');
    expect(result).toContain('green');
    expect(result.split('and').length).toBe(2);
  });

  it('avoids duplicates when both colors map to same name', () => {
    const result = formatColorPalette(['#FF0000', '#CC0000']); // Both map to red
    // Both are red, but may have different modifiers - should still avoid "X and X"
    expect(result).toContain('red');
    // If modifiers differ (e.g., "red" vs "dark red"), the formatted strings differ
    // so we just check that we don't have "red and red" (same exact string)
    const parts = result.split(' and ');
    if (parts.length === 2) {
      expect(parts[0]).not.toBe(parts[1]);
    }
  });
});
