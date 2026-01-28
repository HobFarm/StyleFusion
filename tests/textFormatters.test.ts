import { describe, it, expect } from 'vitest';
import { formatAsText } from '../utils/textFormatters';
import { emptyMetadata, completeMetadata, metadataWithTextOverlay } from './fixtures/testMetadata';

describe('formatAsText', () => {
  it('includes header', () => {
    const result = formatAsText(emptyMetadata);
    expect(result).toContain('=== StyleFusion Metadata Export ===');
  });

  it('includes timestamp line', () => {
    const result = formatAsText(emptyMetadata);
    expect(result).toContain('Generated:');
  });

  it('includes META & INTENT section header', () => {
    const result = formatAsText(emptyMetadata);
    expect(result).toContain('--- META & INTENT ---');
  });

  it('includes SUBJECT DETAILS section header', () => {
    const result = formatAsText(emptyMetadata);
    expect(result).toContain('--- SUBJECT DETAILS ---');
  });

  it('includes SCENE & ATMOSPHERE section header', () => {
    const result = formatAsText(emptyMetadata);
    expect(result).toContain('--- SCENE & ATMOSPHERE ---');
  });

  it('includes TECHNICAL SPECS section header', () => {
    const result = formatAsText(emptyMetadata);
    expect(result).toContain('--- TECHNICAL SPECS ---');
  });

  it('includes PALETTE & MOOD section header', () => {
    const result = formatAsText(emptyMetadata);
    expect(result).toContain('--- PALETTE & MOOD ---');
  });

  it('includes DETAILS & TEXTURES section header', () => {
    const result = formatAsText(emptyMetadata);
    expect(result).toContain('--- DETAILS & TEXTURES ---');
  });

  it('excludes empty field values', () => {
    const result = formatAsText(emptyMetadata);
    expect(result).not.toContain('Intent:');
    expect(result).not.toContain('Archetype:');
  });

  it('includes populated field values', () => {
    const result = formatAsText(completeMetadata);
    expect(result).toContain('Intent: cinematic portrait');
    expect(result).toContain('Archetype: mysterious wanderer');
    expect(result).toContain('Quality: masterpiece, best quality');
    expect(result).toContain('Aspect Ratio: 16:9');
  });

  it('joins array elements with commas', () => {
    const result = formatAsText(completeMetadata);
    expect(result).toContain('Elements: crumbling pillars, scattered leaves, distant mountains');
    expect(result).toContain('Colors: #8B4513, #FFD700, #4A4A4A');
    expect(result).toContain('Textures: weathered leather, rough stone');
    expect(result).toContain('Accents: glowing runes, dust particles');
  });

  it('excludes TEXT CONTENT section when overlay is "None"', () => {
    const result = formatAsText(completeMetadata);
    expect(result).not.toContain('--- TEXT CONTENT ---');
  });

  it('includes TEXT CONTENT section when overlay has value', () => {
    const result = formatAsText(metadataWithTextOverlay);
    expect(result).toContain('--- TEXT CONTENT ---');
    expect(result).toContain('Overlay: EPIC ADVENTURE');
    expect(result).toContain('Font Style: bold sans-serif');
  });

  it('excludes empty style fusion source fields', () => {
    const result = formatAsText(completeMetadata);
    expect(result).not.toContain('Image 3:');
  });

  it('includes NEGATIVE PROMPT section when negative exists', () => {
    const result = formatAsText(completeMetadata);
    expect(result).toContain('--- NEGATIVE PROMPT ---');
    expect(result).toContain('blurry, low quality, cartoon, anime');
  });

  it('excludes NEGATIVE PROMPT section when negative is empty', () => {
    const result = formatAsText(emptyMetadata);
    expect(result).not.toContain('--- NEGATIVE PROMPT ---');
  });

  it('outputs sections in correct order', () => {
    const result = formatAsText(completeMetadata);
    const metaIndex = result.indexOf('--- META & INTENT ---');
    const subjectIndex = result.indexOf('--- SUBJECT DETAILS ---');
    const sceneIndex = result.indexOf('--- SCENE & ATMOSPHERE ---');
    const technicalIndex = result.indexOf('--- TECHNICAL SPECS ---');
    const paletteIndex = result.indexOf('--- PALETTE & MOOD ---');
    const detailsIndex = result.indexOf('--- DETAILS & TEXTURES ---');
    const negativeIndex = result.indexOf('--- NEGATIVE PROMPT ---');

    expect(metaIndex).toBeLessThan(subjectIndex);
    expect(subjectIndex).toBeLessThan(sceneIndex);
    expect(sceneIndex).toBeLessThan(technicalIndex);
    expect(technicalIndex).toBeLessThan(paletteIndex);
    expect(paletteIndex).toBeLessThan(detailsIndex);
    expect(detailsIndex).toBeLessThan(negativeIndex);
  });
});
