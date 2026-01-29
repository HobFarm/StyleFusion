import { useState, useCallback, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  EXTRACTION_MODELS,
  GENERATION_MODELS,
  DEFAULT_EXTRACTION_MODEL_ID,
  DEFAULT_GENERATION_MODEL_ID,
  StaticModelInfo,
} from '../constants';

const STORAGE_KEY = 'stylefusion-gemini-config';
const CURRENT_VERSION = 2;

interface GeminiConfig {
  apiKey: string;
  textModelId: string;
  imageModelId: string;
  version: number;
}

export interface UseGeminiClientReturn {
  apiKey: string;
  textModelId: string;
  imageModelId: string;
  isConfigured: boolean;
  isConnecting: boolean;
  connectionStatus: 'idle' | 'success' | 'error';
  connectionError: string | null;
  textModels: StaticModelInfo[];
  imageModels: StaticModelInfo[];
  setApiKey: (key: string) => void;
  setTextModelId: (modelId: string) => void;
  setImageModelId: (modelId: string) => void;
  testConnection: (keyOverride?: string) => Promise<boolean>;
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
          textModelId: config.modelId || DEFAULT_EXTRACTION_MODEL_ID,
          imageModelId: DEFAULT_GENERATION_MODEL_ID,
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
  return { apiKey: '', textModelId: DEFAULT_EXTRACTION_MODEL_ID, imageModelId: DEFAULT_GENERATION_MODEL_ID, version: CURRENT_VERSION };
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

export function useGeminiClient(): UseGeminiClientReturn {
  const [apiKey, setApiKeyState] = useState<string>('');
  const [textModelId, setTextModelIdState] = useState<string>(DEFAULT_EXTRACTION_MODEL_ID);
  const [imageModelId, setImageModelIdState] = useState<string>(DEFAULT_GENERATION_MODEL_ID);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Static model lists - no fetching required
  const textModels = EXTRACTION_MODELS;
  const imageModels = GENERATION_MODELS;

  // Load config on mount and validate model IDs against static list
  useEffect(() => {
    const config = loadConfig();
    setApiKeyState(config.apiKey);

    // Validate textModelId against static list, fallback to default if invalid
    const validTextModel = EXTRACTION_MODELS.find(m => m.id === config.textModelId);
    setTextModelIdState(validTextModel ? config.textModelId : DEFAULT_EXTRACTION_MODEL_ID);

    // Validate imageModelId against static list, fallback to default if invalid
    const validImageModel = GENERATION_MODELS.find(m => m.id === config.imageModelId);
    setImageModelIdState(validImageModel ? config.imageModelId : DEFAULT_GENERATION_MODEL_ID);
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
    saveConfig({ ...config, textModelId: id || DEFAULT_EXTRACTION_MODEL_ID });
  }, []);

  const setImageModelId = useCallback((id: string) => {
    setImageModelIdState(id);
    const config = loadConfig();
    saveConfig({ ...config, imageModelId: id || DEFAULT_GENERATION_MODEL_ID });
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

  const clearConfig = useCallback(() => {
    setApiKeyState('');
    setTextModelIdState(DEFAULT_EXTRACTION_MODEL_ID);
    setImageModelIdState(DEFAULT_GENERATION_MODEL_ID);
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
    setApiKey,
    setTextModelId,
    setImageModelId,
    testConnection,
    clearConfig,
    validateApiKey,
  };
}
