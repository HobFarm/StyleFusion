// Image label types for reference categorization
export type ImageLabelType =
  | 'style'
  | 'composition'
  | 'color'
  | 'subject'
  | 'texture'
  | 'lighting'
  | 'general';

export interface ImageLabel {
  type: ImageLabelType;
  customLabel?: string;
}

// Identity color with description and hex value
export interface IdentityColor {
  description: string;  // "deep emerald green with amber flecks"
  hex: string;          // "#2E8B57"
}

// Face geometry details for precise facial feature reproduction
export interface FaceGeometry {
  faceShape: string;   // "heart-shaped", "oval", "square", "round", "diamond", "oblong"
  eyeShape: string;    // "almond", "round", "hooded", "monolid", "deep-set", "upturned"
  browStyle: string;   // "natural arch", "straight", "S-shaped", "rounded", "angled"
  noseShape: string;   // "straight bridge", "button", "aquiline", "snub", "wide", "narrow"
  lipShape: string;    // "full", "thin", "cupid's bow", "wide", "heart-shaped"
}

// Hair specifics for precise hair reproduction
export interface HairSpecifics {
  hairLength: string;  // "pixie", "short", "chin-length", "shoulder", "mid-back", "waist"
  hairWave: string;    // "pin-straight", "straight", "wavy", "curly", "coily", "kinky"
  hairPart: string;    // "center", "left", "right", "none", "deep-side"
}

// Confidence scores (0.0-1.0) for DNA extraction reliability
export interface DNAConfidence {
  overall: number;
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
  faceGeometry: number;
  hairSpecifics: number;
}

// Subject identity/DNA for consistent reproduction
export interface SubjectIdentity {
  // Primary colors (adapt label based on subject type)
  primaryColor: IdentityColor;    // Eyes (human), Eye color (animal), Primary chassis (robot)
  secondaryColor: IdentityColor;  // Skin/fur/surface tone
  accentColor: IdentityColor;     // Hair/markings/trim color
  // Structure
  texture: string;                // Hair style, fur pattern, surface finish
  structure: string;              // Face shape, body type, model/build
  distinguishingFeatures: string[];  // Scars, markings, accessories, unique traits
  // Classification
  estimatedAge: string;           // Age range, generation, model year
  species: string;                // Human, feline, canine, android, etc.
  fixedSeed: string;              // Poetic identity anchor phrase
  // Enhanced DNA fields (optional for backward compatibility)
  faceGeometry?: FaceGeometry;          // Detailed facial feature geometry
  hairSpecifics?: HairSpecifics;        // Detailed hair characteristics
  identityNegatives?: string[];         // Features to explicitly avoid (anti-traits)
  confidence?: DNAConfidence;           // Extraction confidence scores
}

export const IMAGE_LABEL_OPTIONS: { type: ImageLabelType; label: string; description: string }[] = [
  { type: 'general', label: 'General Reference', description: 'All-purpose reference' },
  { type: 'style', label: 'Style Reference', description: 'Visual style/rendering' },
  { type: 'composition', label: 'Composition Reference', description: 'Layout/framing' },
  { type: 'color', label: 'Color Reference', description: 'Palette/mood' },
  { type: 'subject', label: 'Subject Reference', description: 'Subject details' },
  { type: 'texture', label: 'Texture Reference', description: 'Material/surface' },
  { type: 'lighting', label: 'Lighting Reference', description: 'Light setup' },
];

export interface GeneratedData {
  jsonResult: ImageMetadata | null;
  descriptionResult: string | null;
}

// Simplified Visual Synthesis Engine schema
// All string fields use empty string "" for missing values (not null)
// All array fields use empty array [] for missing values
export interface ImageMetadata {
  meta: {
    intent: string;
    aspect_ratio: string;
    quality: string;
  };
  subject: {
    archetype: string;
    description: string;
    expression: string;
    pose: string;
    attire: string;
    identity?: SubjectIdentity;  // Character DNA (populated for Subject Reference)
  };
  scene: {
    setting: string;
    atmosphere: string;
    elements: string[];
  };
  technical: {
    shot: string;
    lens: string;
    lighting: string;
    render: string;
  };
  palette: {
    colors: string[];
    mood: string;
  };
  details: {
    textures: string[];
    accents: string[];
  };
  negative: string;
  text_content: {
    overlay: string;
    style: string;
  };
}

export interface ProcessingState {
  isProcessing: boolean;
  step: 'idle' | 'compressing' | 'analyzing' | 'complete' | 'error';
  error: string | null;
  retryInfo?: { attempt: number; maxAttempts: number };
}

// Export format types for prompt generation
// 'universal' = structured comma-separated (JSON workflows)
// 'sd-mj' = optimized for image generation (follows canonical MJ structure)
export type ExportFormat = 'universal' | 'sd-mj';

// Image generation result from Gemini
export interface ImageGenerationResult {
  imageBase64: string;
  mimeType: string;
}

// Section toggles for SD/MJ format (follows canonical slot structure)
export interface SDMJIncludeSections {
  subject: boolean;       // Slot 1: factual subject description
  styleAnchor: boolean;   // Slot 2: "in the style of X"
  colorPalette: boolean;  // Slot 3: "dark X and light Y"
  secondaryStyles: boolean; // Slots 4-6: textures, atmosphere, mood
  technical: boolean;     // Slots 7+: shot, lens
  negative: boolean;      // --no parameter
}

// Section toggles for Universal format (all metadata fields)
export interface UniversalIncludeSections {
  meta: boolean;
  subject: boolean;
  scene: boolean;
  technical: boolean;
  palette: boolean;
  details: boolean;
  textContent: boolean;
  negative: boolean;
}

export interface ExportOptions {
  format: ExportFormat;
  sdmjSections?: SDMJIncludeSections;
  universalSections?: UniversalIncludeSections;
}

// Saved character profile for character library
export interface SavedCharacterProfile {
  id: string;                    // UUID
  name: string;                  // User-defined name
  identity: SubjectIdentity;     // The character DNA
  thumbnail?: string;            // Base64 thumbnail (optional, max 50KB)
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  tags?: string[];               // User-defined tags for filtering
}

// Character library state
export interface CharacterLibrary {
  profiles: SavedCharacterProfile[];
  version: number;               // Schema version for migrations
}

// ============================================================================
// LOCKED PATTERN TYPES - Drift mitigation for character consistency
// ============================================================================

/**
 * Locked value wrapper - contains the positive value and 3 drift negatives
 * Drift negatives are the most likely values the model might incorrectly shift towards
 */
export interface Locked<T = string> {
  is: T;
  not: [string, string, string];  // exactly 3 drift targets
}

/**
 * Locked version of IdentityColor with drift negatives
 */
export interface LockedIdentityColor {
  is: IdentityColor;
  not: [string, string, string];
}

/**
 * Locked version of FaceGeometry - each feature has drift negatives
 */
export interface LockedFaceGeometry {
  faceShape: Locked;
  eyeShape: Locked;
  browStyle: Locked;
  noseShape: Locked;
  lipShape: Locked;
}

/**
 * Locked version of HairSpecifics - each attribute has drift negatives
 */
export interface LockedHairSpecifics {
  hairLength: Locked;
  hairWave: Locked;
  hairPart: Locked;
}

/**
 * Locked version of SubjectIdentity for prompt generation
 * Used internally during prompt assembly - not stored
 */
export interface LockedSubjectIdentity {
  primaryColor: LockedIdentityColor;     // Eyes
  secondaryColor: LockedIdentityColor;   // Skin
  accentColor: LockedIdentityColor;      // Hair
  texture: Locked;
  structure: Locked;
  distinguishingFeatures: string[];      // Additive, no negatives needed
  estimatedAge: string;                  // Not lockable
  species: string;                       // Not lockable
  fixedSeed: string;                     // Not lockable
  faceGeometry?: LockedFaceGeometry;
  hairSpecifics?: LockedHairSpecifics;
  identityNegatives?: string[];          // User-defined negatives (preserved)
  confidence?: DNAConfidence;
}
