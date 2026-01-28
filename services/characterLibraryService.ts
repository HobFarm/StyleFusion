import { SubjectIdentity, SavedCharacterProfile, CharacterLibrary } from '../types';

const STORAGE_KEY = 'stylefusion-character-library';
const CURRENT_VERSION = 1;

/**
 * Create an empty library with current version
 */
function createEmptyLibrary(): CharacterLibrary {
  return {
    profiles: [],
    version: CURRENT_VERSION,
  };
}

/**
 * Migrate library data if needed (future-proofing)
 */
function migrateLibrary(library: CharacterLibrary): CharacterLibrary {
  // Add migration logic here when schema changes
  // For now, just ensure version is current
  return {
    ...library,
    version: CURRENT_VERSION,
  };
}

/**
 * Load the character library from localStorage
 */
export function loadLibrary(): CharacterLibrary {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createEmptyLibrary();
    }

    const parsed = JSON.parse(stored) as CharacterLibrary;

    // Validate structure
    if (!parsed || !Array.isArray(parsed.profiles)) {
      console.warn('Invalid library structure, creating empty library');
      return createEmptyLibrary();
    }

    // Migrate if needed
    if (parsed.version !== CURRENT_VERSION) {
      const migrated = migrateLibrary(parsed);
      saveLibrary(migrated);
      return migrated;
    }

    return parsed;
  } catch (error) {
    console.error('Error loading character library:', error);
    return createEmptyLibrary();
  }
}

/**
 * Save the character library to localStorage
 */
export function saveLibrary(library: CharacterLibrary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  } catch (error) {
    console.error('Error saving character library:', error);
    // If localStorage is full, try to notify
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('Storage full. Try removing some saved characters or reducing thumbnail sizes.');
    }
    throw error;
  }
}

/**
 * Generate a unique ID for a new profile
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save a new character profile
 */
export function saveProfile(
  name: string,
  identity: SubjectIdentity,
  thumbnail?: string,
  tags?: string[]
): SavedCharacterProfile {
  const library = loadLibrary();

  const newProfile: SavedCharacterProfile = {
    id: generateId(),
    name: name.trim() || 'Unnamed Character',
    identity,
    thumbnail,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: tags?.filter(t => t.trim()) || [],
  };

  library.profiles.unshift(newProfile); // Add to beginning
  saveLibrary(library);

  return newProfile;
}

/**
 * Update an existing character profile
 */
export function updateProfile(
  id: string,
  updates: Partial<Omit<SavedCharacterProfile, 'id' | 'createdAt'>>
): SavedCharacterProfile | null {
  const library = loadLibrary();
  const index = library.profiles.findIndex(p => p.id === id);

  if (index === -1) {
    console.warn(`Profile with id ${id} not found`);
    return null;
  }

  const updatedProfile: SavedCharacterProfile = {
    ...library.profiles[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  library.profiles[index] = updatedProfile;
  saveLibrary(library);

  return updatedProfile;
}

/**
 * Delete a character profile
 */
export function deleteProfile(id: string): boolean {
  const library = loadLibrary();
  const initialLength = library.profiles.length;

  library.profiles = library.profiles.filter(p => p.id !== id);

  if (library.profiles.length < initialLength) {
    saveLibrary(library);
    return true;
  }

  return false;
}

/**
 * Get a single profile by ID
 */
export function getProfile(id: string): SavedCharacterProfile | null {
  const library = loadLibrary();
  return library.profiles.find(p => p.id === id) || null;
}

/**
 * Search profiles by name or tags
 */
export function searchProfiles(query: string): SavedCharacterProfile[] {
  const library = loadLibrary();
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return library.profiles;
  }

  return library.profiles.filter(profile => {
    const nameMatch = profile.name.toLowerCase().includes(lowerQuery);
    const tagMatch = profile.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
    return nameMatch || tagMatch;
  });
}

/**
 * Export all profiles as JSON string
 */
export function exportProfiles(): string {
  const library = loadLibrary();
  return JSON.stringify(library, null, 2);
}

/**
 * Import profiles from JSON string
 * Returns the number of profiles imported
 */
export function importProfiles(jsonString: string, overwrite: boolean = false): number {
  try {
    const imported = JSON.parse(jsonString) as CharacterLibrary;

    if (!imported || !Array.isArray(imported.profiles)) {
      throw new Error('Invalid import format');
    }

    const library = overwrite ? createEmptyLibrary() : loadLibrary();

    // Validate and add each profile
    let importedCount = 0;
    for (const profile of imported.profiles) {
      if (profile.id && profile.name && profile.identity) {
        // Generate new ID to avoid conflicts
        const newProfile: SavedCharacterProfile = {
          ...profile,
          id: generateId(),
          updatedAt: new Date().toISOString(),
        };
        library.profiles.push(newProfile);
        importedCount++;
      }
    }

    saveLibrary(library);
    return importedCount;
  } catch (error) {
    console.error('Error importing profiles:', error);
    throw new Error('Failed to import profiles. Please check the file format.');
  }
}

/**
 * Get the total count of saved profiles
 */
export function getProfileCount(): number {
  const library = loadLibrary();
  return library.profiles.length;
}

/**
 * Clear all saved profiles (use with caution)
 */
export function clearAllProfiles(): void {
  saveLibrary(createEmptyLibrary());
}

/**
 * Create a thumbnail from an image file (max 50KB)
 */
export async function createThumbnail(
  file: File,
  maxSize: number = 50 * 1024 // 50KB
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(undefined);
          return;
        }

        // Calculate target size (max 128px)
        const maxDim = 128;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Start with quality 0.8 and reduce if needed
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Reduce quality until under maxSize
        while (dataUrl.length > maxSize && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // If still too large, just don't use thumbnail
        if (dataUrl.length > maxSize) {
          resolve(undefined);
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(undefined);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}
