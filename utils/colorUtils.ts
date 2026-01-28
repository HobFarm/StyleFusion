/**
 * Color utility functions for converting hex colors to descriptive names
 * Used by prompt generators to create human-readable color descriptions
 */

// Base colors with their RGB values
const BASE_COLORS: { name: string; r: number; g: number; b: number }[] = [
  { name: 'red', r: 255, g: 0, b: 0 },
  { name: 'orange', r: 255, g: 165, b: 0 },
  { name: 'yellow', r: 255, g: 255, b: 0 },
  { name: 'green', r: 0, g: 128, b: 0 },
  { name: 'cyan', r: 0, g: 255, b: 255 },
  { name: 'blue', r: 0, g: 0, b: 255 },
  { name: 'indigo', r: 75, g: 0, b: 130 },
  { name: 'purple', r: 128, g: 0, b: 128 },
  { name: 'pink', r: 255, g: 192, b: 203 },
  { name: 'brown', r: 139, g: 69, b: 19 },
  { name: 'gray', r: 128, g: 128, b: 128 },
  { name: 'black', r: 0, g: 0, b: 0 },
  { name: 'white', r: 255, g: 255, b: 255 },
  { name: 'gold', r: 255, g: 215, b: 0 },
  { name: 'silver', r: 192, g: 192, b: 192 },
  { name: 'bronze', r: 205, g: 127, b: 50 },
  { name: 'amber', r: 255, g: 191, b: 0 },
  { name: 'teal', r: 0, g: 128, b: 128 },
  { name: 'navy', r: 0, g: 0, b: 128 },
  { name: 'maroon', r: 128, g: 0, b: 0 },
  { name: 'olive', r: 128, g: 128, b: 0 },
  { name: 'coral', r: 255, g: 127, b: 80 },
  { name: 'azure', r: 0, g: 127, b: 255 },
];

/**
 * Parse a hex color string to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Handle 3-digit hex
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex.split('').map(c => c + c).join('');
  }

  if (fullHex.length !== 6) {
    return null;
  }

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null;
  }

  return { r, g, b };
}

/**
 * Calculate the Euclidean distance between two colors in RGB space
 */
function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

/**
 * Calculate the luminance of a color (0-255 scale)
 */
function getLuminance(rgb: { r: number; g: number; b: number }): number {
  // Using perceived luminance formula
  return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

/**
 * Determine if a color is light or dark
 * Returns 'light', 'dark', or '' (empty for mid-tones)
 */
export function getColorModifier(hex: string): 'light' | 'dark' | '' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';

  const luminance = getLuminance(rgb);

  // Thresholds for light/dark determination
  if (luminance > 180) return 'light';
  if (luminance < 80) return 'dark';
  return '';
}

/**
 * Convert a hex color to its nearest simple color name
 */
export function hexToSimpleColorName(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'unknown';

  let closestColor = BASE_COLORS[0];
  let minDistance = Infinity;

  for (const baseColor of BASE_COLORS) {
    const distance = colorDistance(rgb, baseColor);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = baseColor;
    }
  }

  return closestColor.name;
}

/**
 * Format a color with its modifier (e.g., "dark blue", "light red")
 */
export function formatColorWithModifier(hex: string): string {
  const colorName = hexToSimpleColorName(hex);
  const modifier = getColorModifier(hex);

  // Don't add modifier to black/white as they're already absolute
  if (colorName === 'black' || colorName === 'white') {
    return colorName;
  }

  return modifier ? `${modifier} ${colorName}` : colorName;
}

/**
 * Format two colors as a palette string in MJ format
 * e.g., "dark blue and gold" or "light purple and dark brown"
 */
export function formatColorPalette(colors: string[]): string {
  if (!colors || colors.length === 0) return '';

  if (colors.length === 1) {
    return formatColorWithModifier(colors[0]);
  }

  // Take first two colors (dominant and secondary)
  const color1 = formatColorWithModifier(colors[0]);
  const color2 = formatColorWithModifier(colors[1]);

  // Avoid duplicates
  if (color1 === color2) {
    return color1;
  }

  return `${color1} and ${color2}`;
}
