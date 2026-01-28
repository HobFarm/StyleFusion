import { ImageMetadata, ExportOptions, SDMJIncludeSections, UniversalIncludeSections, SubjectIdentity } from '../types';
import { formatColorPalette, formatColorWithModifier } from './colorUtils';
import { getDriftNegatives } from './hydrateIdentity';

// Default section toggles for SD/MJ format
const DEFAULT_SDMJ_SECTIONS: SDMJIncludeSections = {
  subject: true,
  styleAnchor: true,
  colorPalette: true,
  secondaryStyles: true,
  technical: true,
  negative: true,
};

// Default section toggles for Universal format
const DEFAULT_UNIVERSAL_SECTIONS: UniversalIncludeSections = {
  meta: true,
  subject: true,
  scene: true,
  technical: true,
  palette: true,
  details: true,
  textContent: false,  // Off by default (often empty)
  negative: true,
};

/**
 * Get default export options for a given format
 */
export function getDefaultExportOptions(format: 'universal' | 'sd-mj'): ExportOptions {
  return {
    format,
    sdmjSections: { ...DEFAULT_SDMJ_SECTIONS },
    universalSections: { ...DEFAULT_UNIVERSAL_SECTIONS },
  };
}

/**
 * Build enhanced identity lock string for prompt injection
 * Creates stronger [IDENTITY: ...] blocks with face geometry and hair details
 * Format: [IDENTITY: species, age, face geometry, eye color + eyes, skin tone, hair description, features]
 */
function buildIdentityLock(identity: SubjectIdentity): string {
  const parts: string[] = [];

  // Species/type identifier (high priority)
  if (identity.species) parts.push(identity.species);

  // Age prominently (important for likeness)
  if (identity.estimatedAge) parts.push(identity.estimatedAge);

  // Face geometry (NEW - critical for likeness)
  if (identity.faceGeometry) {
    const geo = identity.faceGeometry;
    const geoParts: string[] = [];
    if (geo.faceShape) geoParts.push(`${geo.faceShape} face`);
    if (geo.eyeShape) geoParts.push(`${geo.eyeShape} eyes`);
    if (geo.browStyle) geoParts.push(`${geo.browStyle} brows`);
    if (geo.noseShape) geoParts.push(`${geo.noseShape} nose`);
    if (geo.lipShape) geoParts.push(`${geo.lipShape} lips`);
    if (geoParts.length > 0) {
      parts.push(geoParts.join(', '));
    }
  }

  // Eye color with "eyes" label
  if (identity.primaryColor.description) {
    parts.push(`${identity.primaryColor.description} eyes`);
  }

  // Skin tone with "skin" label
  if (identity.secondaryColor.description) {
    parts.push(`${identity.secondaryColor.description} skin`);
  }

  // Hair - combine color + specifics into one cohesive description (NEW)
  const hairParts: string[] = [];
  if (identity.hairSpecifics) {
    const hair = identity.hairSpecifics;
    if (hair.hairLength) hairParts.push(hair.hairLength);
    if (hair.hairWave) hairParts.push(hair.hairWave);
  }
  if (identity.accentColor.description) {
    hairParts.push(identity.accentColor.description);
  }
  if (hairParts.length > 0) {
    let hairDesc = hairParts.join(' ') + ' hair';
    // Add part info if available
    if (identity.hairSpecifics?.hairPart && identity.hairSpecifics.hairPart !== 'none') {
      hairDesc += ` parted ${identity.hairSpecifics.hairPart}`;
    }
    parts.push(hairDesc);
  } else if (identity.texture) {
    // Fallback to texture if no hair specifics
    parts.push(identity.texture);
  }

  // Structure (body type) if no face geometry was provided
  if (!identity.faceGeometry && identity.structure) {
    parts.push(identity.structure);
  }

  // Distinguishing features (max 3 for comprehensive likeness)
  if (identity.distinguishingFeatures.length > 0) {
    parts.push(identity.distinguishingFeatures.slice(0, 3).join(', '));
  }

  // Fixed seed anchor phrase (in quotes for emphasis)
  if (identity.fixedSeed) {
    parts.push(`"${identity.fixedSeed}"`);
  }

  return parts.length ? `[IDENTITY: ${parts.join(', ')}]` : '';
}

/**
 * Extract identity negatives for inclusion in negative prompt
 * Combines user-defined negatives with automatically inferred drift negatives
 * Returns array of terms to avoid for maintaining character likeness
 */
function getIdentityNegatives(identity: SubjectIdentity | undefined): string[] {
  if (!identity) return [];

  // Get drift negatives (inferred from identity attributes)
  const driftNegs = getDriftNegatives(identity, 10);

  // Get user-defined negatives
  const userNegs = identity.identityNegatives?.slice(0, 5) || [];

  // Combine and deduplicate, prioritizing user negatives
  const combined = [...userNegs, ...driftNegs];
  const unique = [...new Set(combined)];

  // Return max 12 negatives (5 user + 7 drift)
  return unique.slice(0, 12);
}

/**
 * Generate a Universal prompt - structured comma-separated format
 * Works across all generators, includes all available metadata fields
 */
export function generateUniversalPrompt(
  data: ImageMetadata,
  options?: Partial<ExportOptions>
): string {
  const sections = options?.universalSections ?? DEFAULT_UNIVERSAL_SECTIONS;
  const parts: string[] = [];

  // META section
  if (sections.meta) {
    if (data.meta.intent) parts.push(data.meta.intent);
    if (data.meta.quality) parts.push(data.meta.quality);
  }

  // SUBJECT section
  if (sections.subject) {
    if (data.subject.archetype) parts.push(data.subject.archetype);
    if (data.subject.description) parts.push(data.subject.description);
    if (data.subject.expression) parts.push(data.subject.expression);
    if (data.subject.pose) parts.push(data.subject.pose);
    if (data.subject.attire) parts.push(data.subject.attire);
    // Identity lock injection
    if (data.subject.identity) {
      const lock = buildIdentityLock(data.subject.identity);
      if (lock) parts.push(lock);
    }
  }

  // SCENE section
  if (sections.scene) {
    if (data.scene.setting) parts.push(data.scene.setting);
    if (data.scene.elements?.length) parts.push(data.scene.elements.join(', '));
    if (data.scene.atmosphere) parts.push(data.scene.atmosphere);
  }

  // TECHNICAL section
  if (sections.technical) {
    if (data.technical.shot) parts.push(data.technical.shot);
    if (data.technical.lens) parts.push(`shot with ${data.technical.lens}`);
    if (data.technical.lighting) parts.push(data.technical.lighting);
    if (data.technical.render) parts.push(data.technical.render);
  }

  // PALETTE section
  if (sections.palette) {
    if (data.palette.mood) parts.push(data.palette.mood);
    if (data.palette.colors?.length) {
      const colorNames = data.palette.colors.map(c => formatColorWithModifier(c));
      parts.push(`color palette: ${colorNames.join(', ')}`);
    }
  }

  // DETAILS section
  if (sections.details) {
    if (data.details.textures?.length) parts.push(data.details.textures.join(', '));
    if (data.details.accents?.length) parts.push(data.details.accents.join(', '));
  }

  // TEXT CONTENT section
  if (sections.textContent) {
    if (data.text_content.overlay && data.text_content.overlay !== 'None') {
      let textPart = `text: "${data.text_content.overlay}"`;
      if (data.text_content.style) {
        textPart += ` in ${data.text_content.style} font`;
      }
      parts.push(textPart);
    }
  }

  let prompt = parts.filter(Boolean).join(', ');

  // NEGATIVE section (standard + identity negatives)
  if (sections.negative) {
    const negParts: string[] = [];

    // Standard negatives
    if (data.negative) {
      negParts.push(data.negative);
    }

    // Identity negatives (NEW)
    const identityNegs = getIdentityNegatives(data.subject.identity);
    if (identityNegs.length > 0) {
      negParts.push(identityNegs.join(', '));
    }

    if (negParts.length > 0) {
      prompt += `\n\n--neg ${negParts.join(', ')}`;
    }
  }

  return prompt;
}

/**
 * Generate a SD/MJ prompt - optimized for image generation
 * Follows canonical MJ structure: [SUBJECT], in the style of [STYLE], [COLORS], [SECONDARY], [TECHNICAL]
 *
 * Rules:
 * - Position determines influence (leftmost = strongest)
 * - Optimal length: 5-8 elements (max 10)
 * - Subject must be factual (no style language)
 * - Color palette format: "{modifier} {color} and {modifier} {color}"
 * - "in the style of" appears exactly once at position 2
 * - All lowercase, comma-separated, no periods
 */
export function generateSDMJPrompt(
  data: ImageMetadata,
  options?: Partial<ExportOptions>
): string {
  const sections = options?.sdmjSections ?? DEFAULT_SDMJ_SECTIONS;
  const parts: string[] = [];

  // SLOT 1: Subject (factual, no style language)
  // Combine: archetype + identity + description + pose + setting
  if (sections.subject) {
    const subjectParts: string[] = [];
    if (data.subject.archetype) subjectParts.push(data.subject.archetype);
    // Identity lock injection (after archetype, before description)
    if (data.subject.identity) {
      const lock = buildIdentityLock(data.subject.identity);
      if (lock) subjectParts.push(lock);
    }
    if (data.subject.description) subjectParts.push(data.subject.description);
    if (data.subject.pose) subjectParts.push(data.subject.pose);
    if (data.subject.attire) subjectParts.push(data.subject.attire);
    if (data.scene.setting) subjectParts.push(`in ${data.scene.setting}`);

    if (subjectParts.length) {
      parts.push(subjectParts.join(' '));
    }
  }

  // SLOT 2: Style Anchor (exactly once, with "in the style of")
  if (sections.styleAnchor && data.technical.render) {
    parts.push(`in the style of ${data.technical.render}`);
  }

  // SLOT 3: Color Palette (format: "dark X and light Y")
  if (sections.colorPalette && data.palette.colors?.length >= 2) {
    const palette = formatColorPalette(data.palette.colors);
    if (palette) parts.push(palette);
  }

  // SLOTS 4-6: Secondary Styles (pick 2-3 most impactful)
  if (sections.secondaryStyles) {
    const secondaries: string[] = [];

    // Textures (up to 2)
    if (data.details.textures?.length) {
      secondaries.push(...data.details.textures.slice(0, 2));
    }

    // Atmosphere
    if (data.scene.atmosphere) {
      secondaries.push(data.scene.atmosphere);
    }

    // Palette mood (e.g., "frostpunk", "neon-noir")
    if (data.palette.mood) {
      secondaries.push(data.palette.mood);
    }

    // Accents (up to 1)
    if (data.details.accents?.length) {
      secondaries.push(...data.details.accents.slice(0, 1));
    }

    // Add max 3 secondary styles
    parts.push(...secondaries.slice(0, 3));
  }

  // SLOTS 7+: Technical (low weight, at end)
  if (sections.technical) {
    if (data.technical.shot) parts.push(data.technical.shot);
    if (data.technical.lens) parts.push(data.technical.lens);
  }

  // Assemble prompt (target 5-8 elements, max 8)
  let prompt = parts
    .slice(0, 8)
    .filter(Boolean)
    .join(', ')
    .toLowerCase();

  // Add MJ parameters
  if (data.meta.aspect_ratio) {
    prompt += ` --ar ${data.meta.aspect_ratio}`;
  }

  // NEGATIVE section (--no for standard + identity negatives)
  if (sections.negative) {
    const negParts: string[] = [];

    // Standard negatives from metadata
    if (data.negative) {
      negParts.push(...data.negative.split(',').map(t => t.trim()).filter(Boolean));
    }

    // Identity negatives (NEW - critical for character consistency)
    const identityNegs = getIdentityNegatives(data.subject.identity);
    if (identityNegs.length > 0) {
      negParts.push(...identityNegs);
    }

    // Deduplicate and limit to 8 terms for --no parameter
    if (negParts.length > 0) {
      const uniqueNegs = [...new Set(negParts)].slice(0, 8);
      prompt += ` --no ${uniqueNegs.join(', ')}`;
    }
  }

  return prompt;
}

// Legacy exports for backward compatibility
// These will be removed in a future version
export const generateSDPrompt = generateSDMJPrompt;
export const generateMJPrompt = generateSDMJPrompt;
