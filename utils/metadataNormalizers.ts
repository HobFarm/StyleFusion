import { ImageMetadata, IdentityColor, SubjectIdentity, FaceGeometry, HairSpecifics, DNAConfidence } from '../types';

/**
 * Normalize a value to a string (empty string for null/None/undefined)
 */
export function normalizeString(val: unknown): string {
  if (val === null || val === undefined || val === 'None' || val === 'none') {
    return '';
  }
  return typeof val === 'string' ? val : '';
}

/**
 * Normalize a value to an array of strings (empty array for null/None/undefined)
 */
export function normalizeArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val
      .filter(item => item !== null && item !== 'None' && item !== 'none')
      .map(item => (typeof item === 'string' ? item : String(item)));
  }
  return [];
}

/**
 * Normalize an identity color object
 */
export function normalizeIdentityColor(val: unknown): IdentityColor {
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    return {
      description: normalizeString(obj.description),
      hex: normalizeString(obj.hex) || '',
    };
  }
  return { description: '', hex: '' };
}

/**
 * Normalize face geometry data
 */
export function normalizeFaceGeometry(val: unknown): FaceGeometry | undefined {
  if (!val || typeof val !== 'object') return undefined;

  const geo = val as Record<string, unknown>;
  const result: FaceGeometry = {
    faceShape: normalizeString(geo.faceShape),
    eyeShape: normalizeString(geo.eyeShape),
    browStyle: normalizeString(geo.browStyle),
    noseShape: normalizeString(geo.noseShape),
    lipShape: normalizeString(geo.lipShape),
  };

  // Only return if at least one field is populated
  const hasData = Object.values(result).some(v => v !== '');
  return hasData ? result : undefined;
}

/**
 * Normalize hair specifics data
 */
export function normalizeHairSpecifics(val: unknown): HairSpecifics | undefined {
  if (!val || typeof val !== 'object') return undefined;

  const hair = val as Record<string, unknown>;
  const result: HairSpecifics = {
    hairLength: normalizeString(hair.hairLength),
    hairWave: normalizeString(hair.hairWave),
    hairPart: normalizeString(hair.hairPart),
  };

  // Only return if at least one field is populated
  const hasData = Object.values(result).some(v => v !== '');
  return hasData ? result : undefined;
}

/**
 * Normalize confidence scores, clamping values to 0-1 range
 */
export function normalizeConfidence(val: unknown): DNAConfidence | undefined {
  if (!val || typeof val !== 'object') return undefined;

  const conf = val as Record<string, unknown>;

  // Helper to clamp a value to 0-1 range
  const clamp = (n: unknown): number => {
    const num = typeof n === 'number' ? n : parseFloat(String(n));
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(1, num));
  };

  const result: DNAConfidence = {
    overall: clamp(conf.overall),
    primaryColor: clamp(conf.primaryColor),
    secondaryColor: clamp(conf.secondaryColor),
    accentColor: clamp(conf.accentColor),
    faceGeometry: clamp(conf.faceGeometry),
    hairSpecifics: clamp(conf.hairSpecifics),
  };

  // Only return if overall confidence is non-zero (indicates extraction was attempted)
  return result.overall > 0 ? result : undefined;
}

/**
 * Normalize identity data, returning undefined if no meaningful identity was extracted
 */
export function normalizeIdentity(val: unknown): SubjectIdentity | undefined {
  if (!val || typeof val !== 'object') return undefined;

  const id = val as Record<string, unknown>;
  const primaryColor = normalizeIdentityColor(id.primaryColor);
  const fixedSeed = normalizeString(id.fixedSeed);

  // Only return if meaningful data exists
  if (!primaryColor.description && !fixedSeed) return undefined;

  // Build base identity object
  const identity: SubjectIdentity = {
    primaryColor,
    secondaryColor: normalizeIdentityColor(id.secondaryColor),
    accentColor: normalizeIdentityColor(id.accentColor),
    texture: normalizeString(id.texture),
    structure: normalizeString(id.structure),
    distinguishingFeatures: normalizeArray(id.distinguishingFeatures),
    estimatedAge: normalizeString(id.estimatedAge),
    species: normalizeString(id.species),
    fixedSeed,
  };

  // Add enhanced fields if present
  const faceGeometry = normalizeFaceGeometry(id.faceGeometry);
  if (faceGeometry) {
    identity.faceGeometry = faceGeometry;
  }

  const hairSpecifics = normalizeHairSpecifics(id.hairSpecifics);
  if (hairSpecifics) {
    identity.hairSpecifics = hairSpecifics;
  }

  const identityNegatives = normalizeArray(id.identityNegatives);
  if (identityNegatives.length > 0) {
    identity.identityNegatives = identityNegatives;
  }

  const confidence = normalizeConfidence(id.confidence);
  if (confidence) {
    identity.confidence = confidence;
  }

  return identity;
}

/**
 * Validate structure and return list of issues, or null if valid
 */
export function getValidationIssues(raw: unknown): string[] | null {
  const issues: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return ['Response is not an object'];
  }

  const data = raw as Record<string, unknown>;

  // Check required top-level sections exist
  const requiredSections = ['meta', 'subject', 'scene', 'technical', 'palette', 'details', 'text_content'];
  for (const section of requiredSections) {
    if (!data[section] || typeof data[section] !== 'object') {
      issues.push(`Missing or invalid section: ${section}`);
    }
  }

  return issues.length > 0 ? issues : null;
}

/**
 * Normalize the raw parsed JSON into a valid ImageMetadata object
 */
export function normalizeMetadata(raw: Record<string, unknown>): ImageMetadata {
  const meta = (raw.meta as Record<string, unknown>) || {};
  const subject = (raw.subject as Record<string, unknown>) || {};
  const scene = (raw.scene as Record<string, unknown>) || {};
  const technical = (raw.technical as Record<string, unknown>) || {};
  const palette = (raw.palette as Record<string, unknown>) || {};
  const details = (raw.details as Record<string, unknown>) || {};
  const textContent = (raw.text_content as Record<string, unknown>) || {};

  return {
    meta: {
      intent: normalizeString(meta.intent),
      aspect_ratio: normalizeString(meta.aspect_ratio),
      quality: normalizeString(meta.quality),
    },
    subject: {
      archetype: normalizeString(subject.archetype),
      description: normalizeString(subject.description),
      expression: normalizeString(subject.expression),
      pose: normalizeString(subject.pose),
      attire: normalizeString(subject.attire),
      ...(normalizeIdentity(subject.identity) && { identity: normalizeIdentity(subject.identity) }),
    },
    scene: {
      setting: normalizeString(scene.setting),
      atmosphere: normalizeString(scene.atmosphere),
      elements: normalizeArray(scene.elements),
    },
    technical: {
      shot: normalizeString(technical.shot),
      lens: normalizeString(technical.lens),
      lighting: normalizeString(technical.lighting),
      render: normalizeString(technical.render),
    },
    palette: {
      colors: normalizeArray(palette.colors),
      mood: normalizeString(palette.mood),
    },
    details: {
      textures: normalizeArray(details.textures),
      accents: normalizeArray(details.accents),
    },
    negative: normalizeString(raw.negative),
    text_content: {
      overlay: normalizeString(textContent.overlay),
      style: normalizeString(textContent.style),
    },
  };
}
