import { useState, useCallback, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

const STORAGE_KEY = 'stylefusion-gemini-config';
const CURRENT_VERSION = 2;
const DEFAULT_TEXT_MODEL_ID = 'gemini-2.0-flash';
const DEFAULT_IMAGE_MODEL_ID = 'imagen-3.0-generate-002';

interface GeminiConfig {
  apiKey: string;
  textModelId: string;
  imageModelId: string;
  version: number;
}

export interface ModelInfo {
  id: string;
  label: string;
}

export interface UseGeminiClientReturn {
  apiKey: string;
  textModelId: string;
  imageModelId: string;
  isConfigured: boolean;
  isConnecting: boolean;
  connectionStatus: 'idle' | 'success' | 'error';
  connectionError: string | null;
  textModels: ModelInfo[];
  imageModels: ModelInfo[];
  isLoadingModels: boolean;
  modelsError: string | null;
  setApiKey: (key: string) => void;
  setTextModelId: (modelId: string) => void;
  setImageModelId: (modelId: string) => void;
  testConnection: (keyOverride?: string) => Promise<boolean>;
  fetchModels: () => Promise<boolean>;
  clearConfig: () => void;
  validateApiKey: (key: string) => { valid: boolean; error?: string };
}

function loadConfig(): GeminiConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      // Migration from v1 to v2
      if (config.version === 1) {
        return {
          apiKey: config.apiKey || '',
          textModelId: config.modelId || DEFAULT_TEXT_MODEL_ID,
          imageModelId: DEFAULT_IMAGE_MODEL_ID,
          version: CURRENT_VERSION
        };
      }
      if (config.version === CURRENT_VERSION) {
        return config as GeminiConfig;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { apiKey: '', textModelId: DEFAULT_TEXT_MODEL_ID, imageModelId: DEFAULT_IMAGE_MODEL_ID, version: CURRENT_VERSION };
}

function saveConfig(config: GeminiConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}

export function validateApiKey(key: string): { valid: boolean; error?: string } {
  if (!key || key.trim() === '') {
    return { valid: false, error: 'API key is required' };
  }
  if (!key.startsWith('AIza')) {
    return { valid: false, error: 'API key must start with "AIza"' };
  }
  if (key.length < 30) {
    return { valid: false, error: 'API key appears to be too short' };
  }
  return { valid: true };
}

interface FetchModelsResult {
  textModels: ModelInfo[];
  imageModels: ModelInfo[];
}

async function fetchAvailableModels(key: string): Promise<FetchModelsResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }

  const data = await response.json();

  // Text models: Gemini models with generateContent capability
  // Exclude non-text model variants
  const excludePatterns = ['tts', 'image', 'robotics', 'computer-use', 'nano-banana', 'embedding', 'aqa'];

  const textModels = data.models
    .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
      m.name.toLowerCase().includes('gemini') &&
      m.supportedGenerationMethods?.includes('generateContent') &&
      !excludePatterns.some(pattern => m.name.toLowerCase().includes(pattern))
    )
    .map((m: { name: string; displayName?: string }) => ({
      id: m.name.replace('models/', ''),
      label: m.displayName || m.name.replace('models/', '')
    }))
    .sort((a: ModelInfo, b: ModelInfo) => b.id.localeCompare(a.id));

  // Image models: Imagen models with predict capability
  const imageModels = data.models
    .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
      m.name.includes('imagen') &&
      m.supportedGenerationMethods?.includes('predict')
    )
    .map((m: { name: string; displayName?: string }) => ({
      id: m.name.replace('models/', ''),
      label: m.displayName || m.name.replace('models/', '')
    }))
    .sort((a: ModelInfo, b: ModelInfo) => b.id.localeCompare(a.id));

  return { textModels, imageModels };
}

export function useGeminiClient(): UseGeminiClientReturn {
  const [apiKey, setApiKeyState] = useState<string>('');
  const [textModelId, setTextModelIdState] = useState<string>(DEFAULT_TEXT_MODEL_ID);
  const [imageModelId, setImageModelIdState] = useState<string>(DEFAULT_IMAGE_MODEL_ID);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [textModels, setTextModels] = useState<ModelInfo[]>([]);
  const [imageModels, setImageModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Load config on mount
  useEffect(() => {
    const config = loadConfig();
    setApiKeyState(config.apiKey);
    setTextModelIdState(config.textModelId);
    setImageModelIdState(config.imageModelId);
  }, []);

  const isConfigured = apiKey.trim() !== '' && validateApiKey(apiKey).valid;

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    setConnectionStatus('idle');
    setConnectionError(null);
    const config = loadConfig();
    saveConfig({ ...config, apiKey: key });
  }, []);

  const setTextModelId = useCallback((id: string) => {
    setTextModelIdState(id);
    const config = loadConfig();
    saveConfig({ ...config, textModelId: id || DEFAULT_TEXT_MODEL_ID });
  }, []);

  const setImageModelId = useCallback((id: string) => {
    setImageModelIdState(id);
    const config = loadConfig();
    saveConfig({ ...config, imageModelId: id || DEFAULT_IMAGE_MODEL_ID });
  }, []);

  const testConnection = useCallback(async (keyOverride?: string): Promise<boolean> => {
    const keyToUse = keyOverride ?? apiKey;

    if (!keyToUse.trim()) {
      setConnectionStatus('error');
      setConnectionError('API key is required');
      return false;
    }

    const validation = validateApiKey(keyToUse);
    if (!validation.valid) {
      setConnectionStatus('error');
      setConnectionError(validation.error || 'Invalid API key');
      return false;
    }

    setIsConnecting(true);
    setConnectionStatus('idle');
    setConnectionError(null);

    try {
      const genAI = new GoogleGenerativeAI(keyToUse);
      const model = genAI.getGenerativeModel({ model: textModelId });

      const result = await model.generateContent("Say 'ok'");
      const text = result.response.text();

      if (text) {
        setConnectionStatus('success');
        return true;
      }
      throw new Error('Empty response from API');
    } catch (err) {
      setConnectionStatus('error');
      const message = err instanceof Error ? err.message : 'Connection failed';
      // Make error messages more user-friendly
      if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
        setConnectionError('Invalid API key. Please check your key and try again.');
      } else if (message.includes('403') || message.includes('permission')) {
        setConnectionError('API key does not have permission. Check your Google Cloud Console settings.');
      } else if (message.includes('404') || message.includes('not found')) {
        setConnectionError(`Model "${textModelId}" not found. Try a different model ID.`);
      } else {
        setConnectionError(message);
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [apiKey, textModelId]);

  const fetchModels = useCallback(async (): Promise<boolean> => {
    if (!apiKey.trim()) return false;

    setIsLoadingModels(true);
    setModelsError(null);

    try {
      const result = await fetchAvailableModels(apiKey);
      setTextModels(result.textModels);
      setImageModels(result.imageModels);

      // Auto-select first text model if current not in list
      if (result.textModels.length > 0 && !result.textModels.find(m => m.id === textModelId)) {
        setTextModelIdState(result.textModels[0].id);
        const config = loadConfig();
        saveConfig({ ...config, textModelId: result.textModels[0].id });
      }

      // Auto-select first image model if current not in list
      if (result.imageModels.length > 0 && !result.imageModels.find(m => m.id === imageModelId)) {
        setImageModelIdState(result.imageModels[0].id);
        const config = loadConfig();
        saveConfig({ ...config, imageModelId: result.imageModels[0].id });
      }

      return true;
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Failed to fetch models');
      // Fallback to defaults
      setTextModels([{ id: DEFAULT_TEXT_MODEL_ID, label: 'Gemini 2.0 Flash (Default)' }]);
      setImageModels([{ id: DEFAULT_IMAGE_MODEL_ID, label: 'Imagen 3.0 Generate (Default)' }]);
      return false;
    } finally {
      setIsLoadingModels(false);
    }
  }, [apiKey, textModelId, imageModelId]);

  const clearConfig = useCallback(() => {
    setApiKeyState('');
    setTextModelIdState(DEFAULT_TEXT_MODEL_ID);
    setImageModelIdState(DEFAULT_IMAGE_MODEL_ID);
    setConnectionStatus('idle');
    setConnectionError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  return {
    apiKey,
    textModelId,
    imageModelId,
    isConfigured,
    isConnecting,
    connectionStatus,
    connectionError,
    textModels,
    imageModels,
    isLoadingModels,
    modelsError,
    setApiKey,
    setTextModelId,
    setImageModelId,
    testConnection,
    fetchModels,
    clearConfig,
    validateApiKey,
  };
}
