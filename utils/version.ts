/**
 * Version information for StyleFusion
 * Values are injected at build time via Vite's define config
 */

export const APP_VERSION: string = __APP_VERSION__;
export const BUILD_DATE: string = __BUILD_DATE__;
export const COMMIT_HASH: string = __COMMIT_HASH__;

/**
 * Formatted version string for display
 * Format: "v0.1.0 • abc1234 • 2026-01-27"
 */
export function getVersionString(): string {
  const parts = [`v${APP_VERSION}`];

  if (COMMIT_HASH && COMMIT_HASH !== 'unknown') {
    parts.push(COMMIT_HASH);
  }

  if (BUILD_DATE) {
    parts.push(BUILD_DATE);
  }

  return parts.join(' \u2022 ');
}
