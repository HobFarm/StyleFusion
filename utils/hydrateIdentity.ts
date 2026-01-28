/**
 * Hydration Layer - Transform SubjectIdentity into LockedSubjectIdentity
 *
 * This module converts raw identity data into locked structures with
 * automatically inferred drift negatives. The hydration happens at
 * prompt generation time, not storage time.
 */

import {
  SubjectIdentity,
  LockedSubjectIdentity,
  LockedFaceGeometry,
  LockedHairSpecifics,
  LockedIdentityColor,
  Locked,
  IdentityColor,
  FaceGeometry,
  HairSpecifics,
} from '../types';
import { inferNegatives } from './driftMaps';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a Locked value from a raw string value
 * @param value - The raw attribute value
 * @param category - The drift map category to use
 * @returns Locked structure with inferred negatives
 */
function lock(value: string | undefined, category: string): Locked {
  const safeValue = value || '';
  return {
    is: safeValue,
    not: inferNegatives(category, safeValue),
  };
}

/**
 * Create a LockedIdentityColor from an IdentityColor
 * Uses the description to infer negatives
 * @param color - The identity color with description and hex
 * @param category - The drift map category (e.g., 'eyeColor', 'skinTone', 'hairColor')
 * @returns LockedIdentityColor with inferred negatives
 */
function lockIdentityColor(
  color: IdentityColor,
  category: string
): LockedIdentityColor {
  return {
    is: color,
    not: inferNegatives(category, color.description),
  };
}

/**
 * Create LockedFaceGeometry from FaceGeometry
 * Each facial feature gets its own drift negatives
 */
function lockFaceGeometry(geo: FaceGeometry): LockedFaceGeometry {
  return {
    faceShape: lock(geo.faceShape, 'faceShape'),
    eyeShape: lock(geo.eyeShape, 'eyeShape'),
    browStyle: lock(geo.browStyle, 'browStyle'),
    noseShape: lock(geo.noseShape, 'noseShape'),
    lipShape: lock(geo.lipShape, 'lipShape'),
  };
}

/**
 * Create LockedHairSpecifics from HairSpecifics
 * Each hair attribute gets its own drift negatives
 */
function lockHairSpecifics(hair: HairSpecifics): LockedHairSpecifics {
  return {
    hairLength: lock(hair.hairLength, 'hairLength'),
    hairWave: lock(hair.hairWave, 'hairWave'),
    hairPart: lock(hair.hairPart, 'hairPart'),
  };
}

// ============================================================================
// MAIN HYDRATION FUNCTION
// ============================================================================

/**
 * Hydrate a SubjectIdentity into a LockedSubjectIdentity
 *
 * This transforms the raw identity data into a structure where each
 * lockable attribute has associated drift negatives. The negatives
 * are inferred from drift maps based on the attribute values.
 *
 * @param identity - The raw SubjectIdentity from storage/extraction
 * @returns LockedSubjectIdentity with all attributes locked
 */
export function hydrateIdentity(identity: SubjectIdentity): LockedSubjectIdentity {
  return {
    // Colors - each locked with category-specific negatives
    primaryColor: lockIdentityColor(identity.primaryColor, 'eyeColor'),
    secondaryColor: lockIdentityColor(identity.secondaryColor, 'skinTone'),
    accentColor: lockIdentityColor(identity.accentColor, 'hairColor'),

    // Texture and structure
    texture: lock(identity.texture, 'texture'),
    structure: lock(identity.structure, 'structure'),

    // Non-lockable fields (pass through as-is)
    distinguishingFeatures: identity.distinguishingFeatures || [],
    estimatedAge: identity.estimatedAge || '',
    species: identity.species || '',
    fixedSeed: identity.fixedSeed || '',

    // Optional face geometry (if present)
    faceGeometry: identity.faceGeometry
      ? lockFaceGeometry(identity.faceGeometry)
      : undefined,

    // Optional hair specifics (if present)
    hairSpecifics: identity.hairSpecifics
      ? lockHairSpecifics(identity.hairSpecifics)
      : undefined,

    // Preserve user-defined negatives
    identityNegatives: identity.identityNegatives,

    // Preserve confidence scores
    confidence: identity.confidence,
  };
}

// ============================================================================
// PROMPT PAIR BUILDING
// ============================================================================

/**
 * Result of building prompt components from locked identity
 */
export interface PromptPair {
  positive: string[];
  negative: string[];
}

/**
 * Build prompt pairs from a LockedSubjectIdentity
 *
 * Extracts all positive values and their associated drift negatives
 * for use in prompt generation.
 *
 * @param locked - The hydrated LockedSubjectIdentity
 * @returns PromptPair with positive and negative arrays
 */
export function buildLockedIdentityPromptPair(locked: LockedSubjectIdentity): PromptPair {
  const positive: string[] = [];
  const negative: string[] = [];

  // Species and age (no negatives - these are classification, not appearance)
  if (locked.species) positive.push(locked.species);
  if (locked.estimatedAge) positive.push(locked.estimatedAge);

  // Face geometry with negatives
  if (locked.faceGeometry) {
    const geo = locked.faceGeometry;

    if (geo.faceShape.is) {
      positive.push(`${geo.faceShape.is} face`);
      negative.push(...geo.faceShape.not.filter(Boolean));
    }

    if (geo.eyeShape.is) {
      positive.push(`${geo.eyeShape.is} eyes`);
      negative.push(...geo.eyeShape.not.filter(Boolean));
    }

    if (geo.browStyle.is) {
      positive.push(`${geo.browStyle.is} brows`);
      negative.push(...geo.browStyle.not.filter(Boolean));
    }

    if (geo.noseShape.is) {
      positive.push(`${geo.noseShape.is} nose`);
      negative.push(...geo.noseShape.not.filter(Boolean));
    }

    if (geo.lipShape.is) {
      positive.push(`${geo.lipShape.is} lips`);
      negative.push(...geo.lipShape.not.filter(Boolean));
    }
  }

  // Eye color with negatives
  if (locked.primaryColor.is.description) {
    positive.push(`${locked.primaryColor.is.description} eyes`);
    negative.push(...locked.primaryColor.not.filter(Boolean));
  }

  // Skin tone with negatives
  if (locked.secondaryColor.is.description) {
    positive.push(`${locked.secondaryColor.is.description} skin`);
    negative.push(...locked.secondaryColor.not.filter(Boolean));
  }

  // Hair - combine length, wave, and color into cohesive description
  const hairParts: string[] = [];

  if (locked.hairSpecifics) {
    const hair = locked.hairSpecifics;

    if (hair.hairLength.is) {
      hairParts.push(hair.hairLength.is);
      negative.push(...hair.hairLength.not.filter(Boolean));
    }

    if (hair.hairWave.is) {
      hairParts.push(hair.hairWave.is);
      negative.push(...hair.hairWave.not.filter(Boolean));
    }
  }

  if (locked.accentColor.is.description) {
    hairParts.push(locked.accentColor.is.description);
    negative.push(...locked.accentColor.not.filter(Boolean));
  }

  if (hairParts.length > 0) {
    let hairDesc = hairParts.join(' ') + ' hair';
    // Add part info if available
    if (locked.hairSpecifics?.hairPart.is && locked.hairSpecifics.hairPart.is !== 'none') {
      hairDesc += ` parted ${locked.hairSpecifics.hairPart.is}`;
      negative.push(...locked.hairSpecifics.hairPart.not.filter(Boolean));
    }
    positive.push(hairDesc);
  }

  // Structure/body type with negatives
  if (locked.structure.is) {
    positive.push(`${locked.structure.is} build`);
    negative.push(...locked.structure.not.filter(Boolean));
  }

  // Texture with negatives (if not covered by hair)
  if (locked.texture.is && !locked.hairSpecifics) {
    positive.push(locked.texture.is);
    negative.push(...locked.texture.not.filter(Boolean));
  }

  // Distinguishing features (no negatives - these are additive/unique)
  if (locked.distinguishingFeatures.length > 0) {
    positive.push(locked.distinguishingFeatures.slice(0, 3).join(', '));
  }

  // Fixed seed anchor phrase
  if (locked.fixedSeed) {
    positive.push(`"${locked.fixedSeed}"`);
  }

  // Include user-defined identity negatives
  if (locked.identityNegatives?.length) {
    negative.push(...locked.identityNegatives);
  }

  return {
    positive: positive.filter(Boolean),
    negative: [...new Set(negative.filter(Boolean))], // dedupe negatives
  };
}

/**
 * Get all drift negatives for an identity
 * Convenience function for when you only need the negatives
 *
 * @param identity - The raw SubjectIdentity
 * @param maxNegatives - Maximum number of negatives to return (default: 15)
 * @returns Array of drift negative strings
 */
export function getDriftNegatives(
  identity: SubjectIdentity,
  maxNegatives: number = 15
): string[] {
  const locked = hydrateIdentity(identity);
  const { negative } = buildLockedIdentityPromptPair(locked);
  return negative.slice(0, maxNegatives);
}
