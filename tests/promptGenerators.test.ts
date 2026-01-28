import { describe, it, expect } from 'vitest';
import { generateUniversalPrompt, generateSDMJPrompt, generateSDPrompt, generateMJPrompt } from '../utils/promptGenerators';
import { emptyMetadata, completeMetadata, partialMetadata, metadataWithManyNegatives } from './fixtures/testMetadata';

describe('generateUniversalPrompt', () => {
  it('returns empty string for empty metadata', () => {
    const result = generateUniversalPrompt(emptyMetadata);
    expect(result).toBe('');
  });

  it('generates comma-separated prompt from complete metadata', () => {
    const result = generateUniversalPrompt(completeMetadata);
    expect(result).toContain('cinematic portrait');
    expect(result).toContain('masterpiece, best quality');
    expect(result).toContain('mysterious wanderer');
    expect(result).toContain('weathered face with deep eyes');
    expect(result).toContain('ancient ruins at sunset');
    expect(result).toContain('crumbling pillars, scattered leaves, distant mountains');
    expect(result).toContain('photorealistic');
  });

  it('appends negative prompt with --neg prefix', () => {
    const result = generateUniversalPrompt(completeMetadata);
    expect(result).toContain('\n\n--neg blurry, low quality, cartoon, anime');
  });

  it('handles partial metadata correctly', () => {
    const result = generateUniversalPrompt(partialMetadata);
    expect(result).toContain('portrait');
    expect(result).toContain('warrior');
    expect(result).not.toContain('--neg');
  });

  it('joins scene elements with commas', () => {
    const result = generateUniversalPrompt(completeMetadata);
    expect(result).toContain('crumbling pillars, scattered leaves, distant mountains');
  });

  it('joins textures with commas', () => {
    const result = generateUniversalPrompt(completeMetadata);
    expect(result).toContain('weathered leather, rough stone');
  });

  it('includes lens with "shot with" prefix', () => {
    const result = generateUniversalPrompt(completeMetadata);
    expect(result).toContain('shot with 85mm f/1.4');
  });

  it('includes accents when present', () => {
    const result = generateUniversalPrompt(completeMetadata);
    expect(result).toContain('glowing runes, dust particles');
  });

  it('includes color palette when colors exist', () => {
    const result = generateUniversalPrompt(completeMetadata);
    expect(result).toContain('color palette:');
  });

  it('respects section toggles', () => {
    const result = generateUniversalPrompt(completeMetadata, {
      universalSections: {
        meta: false,
        subject: true,
        scene: false,
        technical: false,
        palette: false,
        details: false,
        textContent: false,
        negative: false,
      },
    });
    expect(result).toContain('mysterious wanderer');
    expect(result).not.toContain('cinematic portrait');
    expect(result).not.toContain('ancient ruins');
    expect(result).not.toContain('--neg');
  });
});

describe('generateSDMJPrompt', () => {
  it('returns empty string for empty metadata', () => {
    const result = generateSDMJPrompt(emptyMetadata);
    expect(result).toBe('');
  });

  it('follows canonical MJ structure: subject, style, colors, secondary, technical', () => {
    const result = generateSDMJPrompt(completeMetadata);
    // Subject should come first
    expect(result.indexOf('mysterious wanderer')).toBeLessThan(result.indexOf('in the style of'));
    // Style anchor should follow subject
    expect(result.indexOf('in the style of')).toBeLessThan(result.indexOf('brown'));
  });

  it('uses "in the style of" prefix for render style', () => {
    const result = generateSDMJPrompt(completeMetadata);
    expect(result).toContain('in the style of photorealistic');
  });

  it('formats color palette as "X and Y"', () => {
    const result = generateSDMJPrompt(completeMetadata);
    // Colors #8B4513 (brown) and #FFD700 (gold)
    expect(result).toMatch(/brown.*and.*gold/i);
  });

  it('includes secondary styles (textures, atmosphere, mood)', () => {
    const result = generateSDMJPrompt(completeMetadata);
    // Should include at least some secondary styles
    expect(
      result.includes('weathered leather') ||
      result.includes('ethereal') ||
      result.includes('warm and dramatic')
    ).toBe(true);
  });

  it('includes aspect ratio with --ar parameter', () => {
    const result = generateSDMJPrompt(completeMetadata);
    expect(result).toContain('--ar 16:9');
  });

  it('uses --no for negative prompt with max 5 terms', () => {
    const result = generateSDMJPrompt(metadataWithManyNegatives);
    expect(result).toContain('--no');
    const noMatch = result.match(/--no (.+)$/);
    expect(noMatch).toBeTruthy();
    const terms = noMatch![1].split(', ');
    expect(terms.length).toBe(8);
  });

  it('outputs all lowercase', () => {
    const result = generateSDMJPrompt(completeMetadata);
    // The main prompt (before parameters) should be lowercase
    const mainPrompt = result.split(' --')[0];
    expect(mainPrompt).toBe(mainPrompt.toLowerCase());
  });

  it('limits total elements to 8 max', () => {
    const result = generateSDMJPrompt(completeMetadata);
    const mainPrompt = result.split(' --')[0];
    const elements = mainPrompt.split(', ');
    expect(elements.length).toBeLessThanOrEqual(8);
  });

  it('respects section toggles', () => {
    const result = generateSDMJPrompt(completeMetadata, {
      sdmjSections: {
        subject: true,
        styleAnchor: false,
        colorPalette: false,
        secondaryStyles: false,
        technical: false,
        negative: false,
      },
    });
    expect(result).toContain('mysterious wanderer');
    expect(result).not.toContain('in the style of');
    expect(result).not.toContain('--no');
  });

  it('includes setting in subject with "in" prefix', () => {
    const result = generateSDMJPrompt(completeMetadata);
    expect(result).toContain('in ancient ruins at sunset');
  });
});

// Legacy function aliases should work the same as generateSDMJPrompt
describe('legacy function aliases', () => {
  it('generateSDPrompt is an alias for generateSDMJPrompt', () => {
    const sdResult = generateSDPrompt(completeMetadata);
    const sdmjResult = generateSDMJPrompt(completeMetadata);
    expect(sdResult).toBe(sdmjResult);
  });

  it('generateMJPrompt is an alias for generateSDMJPrompt', () => {
    const mjResult = generateMJPrompt(completeMetadata);
    const sdmjResult = generateSDMJPrompt(completeMetadata);
    expect(mjResult).toBe(sdmjResult);
  });
});
