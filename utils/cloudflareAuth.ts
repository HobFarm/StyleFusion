/**
 * Cloudflare Access authentication utilities
 */

const APP_STORAGE_KEYS = [
  'stylefusion-gemini-config',
  'stylefusion-character-library',
];

/**
 * Decode CF_Authorization cookie to get user email from Cloudflare Access JWT
 */
export function getCFUserEmail(): string | null {
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('CF_Authorization='));

  if (!cookie) return null;

  try {
    const token = cookie.split('=')[1];
    // JWT format: header.payload.signature - we need payload (middle part)
    const payload = token.split('.')[1];
    // Base64URL decode (replace URL-safe chars with standard base64)
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const data = JSON.parse(decoded);
    return data.email || null;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated via Cloudflare Access
 */
export function isAuthenticated(): boolean {
  return getCFUserEmail() !== null;
}

/**
 * Clear all app-specific data from localStorage
 */
export function clearAllAppData(): void {
  APP_STORAGE_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  });
}

/**
 * Sign out: clear all app data and redirect to Cloudflare Access logout
 */
export function signOut(): void {
  clearAllAppData();
  window.location.href = '/.cdn-cgi/access/logout';
}
