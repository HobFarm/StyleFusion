/**
 * Drift Maps - Client-side lookup tables for inferring drift negatives
 *
 * Each map contains attribute values as keys and their 3 most likely drift targets as values.
 * These are used to automatically generate negative prompts that prevent the model from
 * drifting away from the intended attribute.
 */

export type DriftMap = Record<string, [string, string, string]>;

// ============================================================================
// EYE COLOR DRIFT
// ============================================================================

export const EYE_COLOR_DRIFT: DriftMap = {
  'violet': ['blue', 'purple', 'lavender'],
  'blue': ['grey', 'teal', 'green'],
  'green': ['teal', 'hazel', 'blue'],
  'hazel': ['brown', 'green', 'amber'],
  'brown': ['black', 'amber', 'dark'],
  'amber': ['brown', 'orange', 'golden'],
  'grey': ['blue', 'silver', 'pale'],
  'gray': ['blue', 'silver', 'pale'],
  'black': ['dark brown', 'deep', 'hollow'],
  'red': ['crimson', 'pink', 'burgundy'],
  'gold': ['amber', 'yellow', 'orange'],
  'golden': ['amber', 'yellow', 'brown'],
  'silver': ['grey', 'white', 'pale'],
  'teal': ['blue', 'green', 'aqua'],
  'aqua': ['blue', 'teal', 'cyan'],
  'heterochromia': ['matching eyes', 'same color', 'uniform'],
};

// ============================================================================
// EYE SHAPE DRIFT
// ============================================================================

export const EYE_SHAPE_DRIFT: DriftMap = {
  'almond': ['round', 'wide', 'narrow'],
  'round': ['almond', 'narrow', 'angular'],
  'hooded': ['wide-open', 'round', 'prominent'],
  'downturned': ['upturned', 'neutral', 'wide'],
  'upturned': ['downturned', 'neutral', 'droopy'],
  'monolid': ['double lid', 'creased', 'deep-set'],
  'deep-set': ['prominent', 'bulging', 'shallow'],
  'prominent': ['deep-set', 'sunken', 'hooded'],
  'wide-set': ['close-set', 'narrow', 'close'],
  'close-set': ['wide-set', 'far apart', 'wide'],
};

// ============================================================================
// FACE SHAPE DRIFT
// ============================================================================

export const FACE_SHAPE_DRIFT: DriftMap = {
  'oval': ['round', 'oblong', 'angular'],
  'round': ['oval', 'square', 'angular'],
  'angular': ['soft', 'round', 'gentle'],
  'square': ['round', 'rectangular', 'oval'],
  'heart': ['oval', 'round', 'triangular'],
  'heart-shaped': ['oval', 'round', 'triangular'],
  'oblong': ['oval', 'rectangular', 'round'],
  'diamond': ['oval', 'angular', 'heart'],
  'rectangular': ['square', 'oval', 'round'],
  'triangular': ['heart', 'oval', 'round'],
  'soft': ['angular', 'sharp', 'defined'],
};

// ============================================================================
// BROW STYLE DRIFT
// ============================================================================

export const BROW_STYLE_DRIFT: DriftMap = {
  'natural arch': ['straight', 'flat', 'angular'],
  'high arch': ['low', 'straight', 'flat'],
  'straight': ['arched', 'curved', 'rounded'],
  's-shaped': ['straight', 'arched', 'angular'],
  'rounded': ['angular', 'straight', 'sharp'],
  'angled': ['rounded', 'soft', 'curved'],
  'thick': ['thin', 'sparse', 'light'],
  'thin': ['thick', 'bushy', 'heavy'],
  'bushy': ['thin', 'groomed', 'sparse'],
};

// ============================================================================
// NOSE SHAPE DRIFT
// ============================================================================

export const NOSE_SHAPE_DRIFT: DriftMap = {
  'straight': ['curved', 'hooked', 'upturned'],
  'straight bridge': ['curved', 'hooked', 'bumpy'],
  'button': ['long', 'pointed', 'aquiline'],
  'aquiline': ['button', 'snub', 'flat'],
  'snub': ['long', 'pointed', 'aquiline'],
  'wide': ['narrow', 'thin', 'pointed'],
  'narrow': ['wide', 'broad', 'flat'],
  'roman': ['button', 'flat', 'snub'],
  'upturned': ['downturned', 'straight', 'hooked'],
  'hooked': ['straight', 'button', 'upturned'],
};

// ============================================================================
// LIP SHAPE DRIFT
// ============================================================================

export const LIP_SHAPE_DRIFT: DriftMap = {
  'full': ['thin', 'narrow', 'flat'],
  'thin': ['full', 'plump', 'thick'],
  "cupid's bow": ['flat', 'straight', 'undefined'],
  'wide': ['narrow', 'small', 'thin'],
  'heart-shaped': ['straight', 'flat', 'wide'],
  'bow-shaped': ['straight', 'flat', 'thin'],
  'plump': ['thin', 'narrow', 'flat'],
  'natural': ['exaggerated', 'enhanced', 'artificial'],
};

// ============================================================================
// HAIR LENGTH DRIFT
// ============================================================================

export const HAIR_LENGTH_DRIFT: DriftMap = {
  'bald': ['hair', 'long hair', 'short hair'],
  'shaved': ['long', 'medium', 'flowing'],
  'buzzed': ['long', 'flowing', 'shoulder'],
  'cropped': ['long', 'flowing', 'waist'],
  'pixie': ['long', 'flowing', 'shoulder-length'],
  'short': ['long', 'flowing', 'waist-length'],
  'chin-length': ['long', 'short', 'waist'],
  'chin': ['long', 'short', 'waist'],
  'shoulder-length': ['waist', 'short', 'cropped'],
  'shoulder': ['waist', 'short', 'cropped'],
  'mid-back': ['short', 'cropped', 'chin'],
  'waist-length': ['short', 'cropped', 'pixie'],
  'waist': ['short', 'cropped', 'pixie'],
  'hip-length': ['short', 'cropped', 'chin'],
  'floor-length': ['short', 'medium', 'shoulder'],
  'long': ['short', 'cropped', 'pixie'],
};

// ============================================================================
// HAIR WAVE/TEXTURE DRIFT
// ============================================================================

export const HAIR_WAVE_DRIFT: DriftMap = {
  'pin-straight': ['wavy', 'curly', 'coiled'],
  'straight': ['wavy', 'curly', 'kinky'],
  'slightly wavy': ['straight', 'curly', 'coiled'],
  'wavy': ['straight', 'curly', 'coiled'],
  'loose waves': ['straight', 'tight curls', 'coiled'],
  'curly': ['straight', 'wavy', 'pin-straight'],
  'tight curls': ['loose', 'wavy', 'straight'],
  'coily': ['straight', 'wavy', 'loose'],
  'coiled': ['straight', 'wavy', 'loose'],
  'kinky': ['straight', 'wavy', 'loose waves'],
  'afro': ['straight', 'wavy', 'flat'],
  'textured': ['smooth', 'straight', 'sleek'],
};

// ============================================================================
// HAIR PART DRIFT
// ============================================================================

export const HAIR_PART_DRIFT: DriftMap = {
  'center': ['side', 'left', 'right'],
  'left': ['right', 'center', 'middle'],
  'right': ['left', 'center', 'middle'],
  'deep side': ['center', 'middle', 'slight'],
  'none': ['parted', 'center part', 'side part'],
  'middle': ['side', 'left', 'right'],
};

// ============================================================================
// HAIR COLOR DRIFT
// ============================================================================

export const HAIR_COLOR_DRIFT: DriftMap = {
  'black': ['brown', 'dark brown', 'grey'],
  'dark brown': ['black', 'light brown', 'auburn'],
  'brown': ['black', 'blonde', 'red'],
  'light brown': ['dark brown', 'blonde', 'auburn'],
  'auburn': ['brown', 'red', 'copper'],
  'red': ['auburn', 'orange', 'brown'],
  'ginger': ['red', 'blonde', 'auburn'],
  'strawberry blonde': ['blonde', 'red', 'ginger'],
  'blonde': ['brown', 'dark', 'black'],
  'platinum': ['yellow blonde', 'golden', 'grey'],
  'white': ['grey', 'blonde', 'silver'],
  'grey': ['white', 'black', 'brown'],
  'gray': ['white', 'black', 'brown'],
  'silver': ['grey', 'white', 'blonde'],
  'blue': ['black', 'purple', 'teal'],
  'purple': ['blue', 'pink', 'black'],
  'pink': ['purple', 'red', 'blonde'],
  'green': ['blue', 'teal', 'black'],
};

// ============================================================================
// SKIN TONE DRIFT
// ============================================================================

export const SKIN_TONE_DRIFT: DriftMap = {
  'porcelain': ['tan', 'dark', 'olive'],
  'fair': ['tan', 'dark', 'olive'],
  'pale': ['tan', 'dark', 'medium'],
  'light': ['dark', 'tan', 'deep'],
  'medium': ['pale', 'dark', 'fair'],
  'olive': ['pale', 'dark', 'fair'],
  'tan': ['pale', 'fair', 'dark'],
  'golden': ['pale', 'cool', 'ashen'],
  'brown': ['pale', 'fair', 'light'],
  'dark': ['pale', 'fair', 'light'],
  'deep': ['pale', 'fair', 'light'],
  'ebony': ['pale', 'fair', 'light'],
  'warm': ['cool', 'cold', 'ashen'],
  'cool': ['warm', 'golden', 'yellow'],
  'neutral': ['warm', 'cool', 'extreme'],
};

// ============================================================================
// BODY STRUCTURE DRIFT
// ============================================================================

export const BODY_STRUCTURE_DRIFT: DriftMap = {
  'petite': ['tall', 'large', 'heavy'],
  'slim': ['heavy', 'muscular', 'stocky'],
  'slender': ['stocky', 'muscular', 'heavy'],
  'athletic': ['overweight', 'thin', 'frail'],
  'toned': ['soft', 'flabby', 'heavy'],
  'average': ['extreme', 'very thin', 'very heavy'],
  'curvy': ['angular', 'thin', 'flat'],
  'muscular': ['thin', 'frail', 'soft'],
  'stocky': ['thin', 'tall', 'lanky'],
  'heavy': ['thin', 'slender', 'petite'],
  'tall': ['short', 'petite', 'small'],
  'short': ['tall', 'lanky', 'elongated'],
};

// ============================================================================
// TEXTURE DRIFT (Hair/Surface)
// ============================================================================

export const TEXTURE_DRIFT: DriftMap = {
  'silky': ['coarse', 'rough', 'wiry'],
  'smooth': ['rough', 'textured', 'coarse'],
  'soft': ['coarse', 'wiry', 'rough'],
  'coarse': ['silky', 'smooth', 'fine'],
  'fine': ['thick', 'coarse', 'heavy'],
  'thick': ['thin', 'fine', 'sparse'],
  'wiry': ['silky', 'soft', 'smooth'],
  'fluffy': ['flat', 'sleek', 'limp'],
  'sleek': ['fluffy', 'messy', 'wild'],
};

// ============================================================================
// INFERENCE FUNCTIONS
// ============================================================================

/**
 * Find the best matching drift negatives for a value
 * Uses exact match, partial match, and word-level matching
 */
function findBestMatch(value: string, map: DriftMap): [string, string, string] | null {
  const normalized = value.toLowerCase().trim();

  // 1. Exact match
  if (map[normalized]) return map[normalized];

  // 2. Partial match - value contains key or key contains value
  for (const [key, negatives] of Object.entries(map)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return negatives;
    }
  }

  // 3. Word-level match - any word in value matches a key
  const words = normalized.split(/[\s-]+/);
  for (const word of words) {
    if (word.length > 2 && map[word]) {
      return map[word];
    }
  }

  return null;
}

// Default negatives when no match found
const DEFAULT_NEGATIVES: [string, string, string] = ['different', 'changed', 'altered'];

/**
 * Infer drift negatives for a given category and value
 * @param category - The attribute category (e.g., 'eyeColor', 'faceShape')
 * @param value - The attribute value (e.g., 'blue', 'oval')
 * @returns Tuple of 3 drift negatives
 */
export function inferNegatives(
  category: string,
  value: string
): [string, string, string] {
  if (!value || value.trim() === '') return DEFAULT_NEGATIVES;

  const maps: Record<string, DriftMap> = {
    // Eye attributes
    eyeColor: EYE_COLOR_DRIFT,
    eyeShape: EYE_SHAPE_DRIFT,
    primaryColor: EYE_COLOR_DRIFT,

    // Face attributes
    faceShape: FACE_SHAPE_DRIFT,
    browStyle: BROW_STYLE_DRIFT,
    noseShape: NOSE_SHAPE_DRIFT,
    lipShape: LIP_SHAPE_DRIFT,

    // Hair attributes
    hairLength: HAIR_LENGTH_DRIFT,
    hairWave: HAIR_WAVE_DRIFT,
    hairPart: HAIR_PART_DRIFT,
    hairColor: HAIR_COLOR_DRIFT,
    accentColor: HAIR_COLOR_DRIFT,

    // Skin attributes
    skinTone: SKIN_TONE_DRIFT,
    secondaryColor: SKIN_TONE_DRIFT,

    // Body attributes
    structure: BODY_STRUCTURE_DRIFT,
    bodyBuild: BODY_STRUCTURE_DRIFT,

    // Texture
    texture: TEXTURE_DRIFT,
  };

  const map = maps[category];
  if (!map) return DEFAULT_NEGATIVES;

  return findBestMatch(value, map) || DEFAULT_NEGATIVES;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const inferEyeColorNegatives = (v: string) => inferNegatives('eyeColor', v);
export const inferEyeShapeNegatives = (v: string) => inferNegatives('eyeShape', v);
export const inferFaceShapeNegatives = (v: string) => inferNegatives('faceShape', v);
export const inferBrowStyleNegatives = (v: string) => inferNegatives('browStyle', v);
export const inferNoseShapeNegatives = (v: string) => inferNegatives('noseShape', v);
export const inferLipShapeNegatives = (v: string) => inferNegatives('lipShape', v);
export const inferHairLengthNegatives = (v: string) => inferNegatives('hairLength', v);
export const inferHairWaveNegatives = (v: string) => inferNegatives('hairWave', v);
export const inferHairColorNegatives = (v: string) => inferNegatives('hairColor', v);
export const inferSkinToneNegatives = (v: string) => inferNegatives('skinTone', v);
export const inferStructureNegatives = (v: string) => inferNegatives('structure', v);
