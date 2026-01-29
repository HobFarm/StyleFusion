import { GoogleGenerativeAI, Part, GenerativeModel, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import heic2any from "heic2any";
import { JSON_SYSTEM_PROMPT, DESC_SYSTEM_PROMPT, MJ_COMPILER_SYSTEM_PROMPT, API_TIMEOUT_MS, IMAGE_PROCESSING_TIMEOUT_MS, RETRY_CONFIG, MAX_FILE_SIZE } from "../constants";
import { ImageMetadata, ImageLabel, IMAGE_LABEL_OPTIONS, ImageGenerationResult, MJCompilerResult } from "../types";
import { logger } from "./loggingService";
import { normalizeMetadata } from "../utils/metadataNormalizers";

/**
 * Get API key from localStorage (used when not passed as parameter)
 */
function getStoredApiKey(): string | null {
  try {
    const stored = localStorage.getItem('stylefusion-gemini-config');
    if (stored) {
      const config = JSON.parse(stored);
      return config.apiKey || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Model configuration
 */
const PRIMARY_MODEL = "gemini-3-pro-preview";
const FALLBACK_MODEL = "gemini-3-flash-preview";

/**
 * Image generation model configuration
 */
const PRIMARY_IMAGE_MODEL = "gemini-3-pro-image-preview";
const FALLBACK_IMAGE_MODEL = "imagen-3.0-generate-002";
const IMAGE_GEN_FALLBACK_TIMEOUT_MS = 180000; // 3 minutes before fallback to Imagen

/**
 * Check if a model is an Imagen model (uses :predict endpoint)
 */
function isImagenModel(model: string): boolean {
  return model.toLowerCase().includes('imagen');
}

/**
 * Progress callback for tracking analysis status
 */
export type AnalysisProgressCallback = (info: {
  phase: 'processing' | 'analyzing';
  attempt?: number;
  maxAttempts?: number;
  model?: string;
}) => void;

/**
 * HTTP status codes that are considered transient/retryable
 */
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

/**
 * Check if an error is retryable (transient)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for specific HTTP status codes
    for (const code of RETRYABLE_STATUS_CODES) {
      if (message.includes(`${code}`) || message.includes(`status ${code}`)) {
        return true;
      }
    }

    // Check for common transient error patterns
    if (
      message.includes('service unavailable') ||
      message.includes('overloaded') ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('temporarily unavailable')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if error is a timeout
 */
function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'TimeoutError' ||
           error.message.toLowerCase().includes('timeout') ||
           error.message.toLowerCase().includes('timed out');
  }
  return false;
}

/**
 * Check if error is a service overload (503) error
 */
function isServiceOverloadError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('503') || msg.includes('overloaded') || msg.includes('service unavailable');
  }
  return false;
}

/**
 * Extract HTTP status code from error if present
 */
function extractStatusCode(error: unknown): number | null {
  if (error instanceof Error) {
    const match = error.message.match(/\b([4-5]\d{2})\b/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number): number {
  const { baseDelayMs, maxDelayMs } = RETRY_CONFIG;
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  // Add jitter (0-25% of the delay) to prevent thundering herd
  const jitter = Math.random() * 0.25 * exponentialDelay;
  // Cap at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Helper to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap a promise with a timeout that properly cleans up
 */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  operation: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(
        `Request timed out after ${ms / 1000} seconds during ${operation}. ` +
        `This may indicate network issues or the API is overloaded. ` +
        `Please try again with smaller images or fewer images.`
      );
      error.name = 'TimeoutError';
      reject(error);
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Check if an abort signal has been triggered
 */
function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const error = new DOMException('Generation cancelled by user', 'AbortError');
    throw error;
  }
}

/**
 * Generates content with exponential backoff retry logic for transient errors
 */
async function generateWithRetry(
  model: GenerativeModel,
  content: (Part | { text: string })[],
  maxRetries: number = RETRY_CONFIG.maxRetries,
  signal?: AbortSignal,
  onProgress?: AnalysisProgressCallback,
  modelName?: string
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    checkAborted(signal);

    // Report progress at the start of each attempt
    if (onProgress) {
      onProgress({ 
        phase: 'analyzing', 
        attempt: attempt + 1, 
        maxAttempts: maxRetries + 1,
        model: modelName 
      });
    }

    if (attempt > 0) {
      const backoffDelay = calculateBackoffDelay(attempt - 1);
      const statusCode = lastError ? extractStatusCode(lastError) : null;
      logger.info(`Retry attempt ${attempt}/${maxRetries}`, {
        model: modelName,
        reason: lastError?.message,
        statusCode,
        delayMs: Math.round(backoffDelay)
      });
      await delay(backoffDelay);
    }

    try {
      checkAborted(signal);

      const response = await withTimeout(
        model.generateContent(content, { signal }),
        API_TIMEOUT_MS,
        'content generation'
      );

      checkAborted(signal);

      logger.debug("API Response received", {
        model: modelName,
        hasPromptFeedback: !!response.response.promptFeedback,
        candidateCount: response.response.candidates?.length ?? 0
      });

      // Diagnostic: Log candidate structure to understand empty responses
      const firstCandidate = response.response.candidates?.[0];
      if (firstCandidate) {
        logger.debug("Candidate structure", {
          finishReason: firstCandidate.finishReason,
          contentParts: firstCandidate.content?.parts?.length ?? 0,
          partTypes: firstCandidate.content?.parts?.map(p => Object.keys(p)),
          firstPartPreview: (firstCandidate.content?.parts?.[0] as { text?: string })?.text?.substring(0, 100)
        });
      }

      const text = response.response.text();
      logger.debug("Response text length", { length: text?.length ?? 0 });

      if (text) {
        if (attempt > 0) {
          logger.info(`Request succeeded after ${attempt} retries`, { model: modelName });
        }
        return text;
      }

      const feedback = response.response.promptFeedback;
      if (feedback?.blockReason) {
        // Content blocked - don't retry
        const error = new Error(`Response blocked: ${feedback.blockReason}`);
        logger.error('Response blocked by API', { blockReason: feedback.blockReason });
        throw error;
      }

      const candidates = response.response.candidates;
      if (candidates && candidates.length > 0) {
        const finishReason = candidates[0].finishReason;
        if (finishReason && finishReason !== 'STOP') {
          // Non-retryable finish reason
          const error = new Error(`Generation stopped: ${finishReason}`);
          logger.error('Generation stopped early', { finishReason });
          throw error;
        }
      }

      lastError = new Error("Empty response received");
      logger.warn(`Empty response on attempt ${attempt + 1}`, { model: modelName });
    } catch (err) {
      const error = err as Error;

      // Don't retry user cancellations
      if (error.name === 'AbortError') {
        throw error;
      }

      // Check if error is retryable (503, timeout, network issues)
      const shouldRetry = error.name === 'TimeoutError' || isRetryableError(error);

      if (!shouldRetry || attempt >= maxRetries) {
        // Non-retryable error or exhausted retries
        throw error;
      }

      lastError = error;
      const statusCode = extractStatusCode(error);

      logger.warn(`Generation attempt ${attempt + 1} failed (will retry)`, {
        model: modelName,
        error: error.message,
        name: error.name,
        statusCode,
        isRetryable: shouldRetry
      });
    }
  }

  logger.error('All retry attempts exhausted', {
    model: modelName,
    lastError: lastError?.message,
    attempts: maxRetries + 1
  });

  // Provide user-friendly error message based on error type
  const statusCode = lastError ? extractStatusCode(lastError) : null;
  if (statusCode === 503) {
    throw new Error(
      "The AI service is temporarily unavailable (503). " +
      "This usually resolves within a few minutes. Please try again shortly."
    );
  }
  if (statusCode === 429) {
    throw new Error(
      "Rate limit exceeded. Please wait a moment before trying again."
    );
  }

  throw new Error(
    "The AI service returned an empty response after multiple attempts. " +
    "Please try again or use different images."
  );
}

/**
 * Options for generateWithModel
 */
interface GenerateOptions {
  useJsonMode?: boolean;
}

/**
 * Generate with a specific model (no fallback logic)
 */
async function generateWithModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  systemInstruction: string,
  content: (Part | { text: string })[],
  options: GenerateOptions,
  signal?: AbortSignal,
  onProgress?: AnalysisProgressCallback
): Promise<string> {
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
  ];

  const generationConfig: Record<string, unknown> = {};
  if (options.useJsonMode) {
    generationConfig.responseMimeType = "application/json";
  }

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    ...(Object.keys(generationConfig).length > 0 && { generationConfig }),
    safetySettings
  });

  logger.info(`Starting generation with ${modelName}`, {
    useJsonMode: options.useJsonMode
  });

  return generateWithRetry(model, content, RETRY_CONFIG.maxRetries, signal, onProgress, modelName);
}

/**
 * Generate with primary model, fallback to Flash on timeout
 */
async function generateWithFallback(
  genAI: GoogleGenerativeAI,
  systemInstruction: string,
  content: (Part | { text: string })[],
  useJsonMode: boolean,
  signal?: AbortSignal,
  onProgress?: AnalysisProgressCallback
): Promise<string> {
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
  ];

  // Create primary model (Pro)
  const primaryModel = genAI.getGenerativeModel({
    model: PRIMARY_MODEL,
    systemInstruction,
    ...(useJsonMode && { generationConfig: { responseMimeType: "application/json" } }),
    safetySettings
  });

  logger.info(`Starting generation with ${PRIMARY_MODEL}`);

  try {
    return await generateWithRetry(
      primaryModel, 
      content, 
      RETRY_CONFIG.maxRetries, 
      signal, 
      onProgress,
      PRIMARY_MODEL
    );
  } catch (error) {
    // Check if this was a timeout or service overload - fallback to Flash
    if (isTimeoutError(error) || isServiceOverloadError(error)) {
      logger.warn(`${PRIMARY_MODEL} failed, falling back to ${FALLBACK_MODEL}`, {
        error: (error as Error).message,
        isTimeout: isTimeoutError(error),
        isOverload: isServiceOverloadError(error)
      });

      // Create fallback model (Flash)
      const fallbackModel = genAI.getGenerativeModel({
        model: FALLBACK_MODEL,
        systemInstruction,
        ...(useJsonMode && { generationConfig: { responseMimeType: "application/json" } }),
        safetySettings
      });

      logger.info(`Retrying with fallback model ${FALLBACK_MODEL}`);

      return await generateWithRetry(
        fallbackModel, 
        content, 
        RETRY_CONFIG.maxRetries, 
        signal, 
        onProgress,
        FALLBACK_MODEL
      );
    }

    // Not a timeout - rethrow
    throw error;
  }
}

/**
 * Converts a File to a base64 string suitable for the Gemini API,
 * applying client-side downscaling if necessary.
 * Handles HEIC/HEIF conversion to JPEG since browsers can't decode these formats.
 * Properly aborts FileReader and Image decode when signal fires.
 */
async function fileToGenerativePart(file: File, signal?: AbortSignal): Promise<Part> {
  checkAborted(signal);

  // Enforce file size limit early
  if (file.size > MAX_FILE_SIZE) {
    const maxMB = Math.round(MAX_FILE_SIZE / 1024 / 1024);
    const fileMB = (file.size / 1024 / 1024).toFixed(1);
    logger.error('File exceeds size limit', { fileName: file.name, size: file.size, maxSize: MAX_FILE_SIZE });
    throw new Error(`File "${file.name}" (${fileMB}MB) exceeds maximum size of ${maxMB}MB`);
  }

  // Convert HEIC/HEIF to JPEG since browsers can't decode these formats
  let processedFile = file;
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    logger.info('Converting HEIC/HEIF to JPEG', { fileName: file.name });
    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9
      });
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      processedFile = new File(
        [blob],
        file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'),
        { type: 'image/jpeg' }
      );
      logger.info('HEIC/HEIF conversion complete', {
        originalName: file.name,
        newName: processedFile.name,
        originalSize: file.size,
        newSize: processedFile.size
      });
    } catch (err) {
      logger.error('Failed to convert HEIC/HEIF', { fileName: file.name, error: err });
      throw new Error(`Failed to convert HEIC/HEIF image: ${file.name}`);
    }
    checkAborted(signal);
  }

  return new Promise((resolve, reject) => {
    let aborted = false;
    const reader = new FileReader();
    const img = new Image();

    // Cleanup function to abort operations
    const cleanup = () => {
      aborted = true;
      reader.abort();
      img.src = ''; // Hint browser to stop decoding
    };

    // Listen for abort signal
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Generation cancelled by user', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort);

    // Helper to remove abort listener
    const removeAbortListener = () => {
      signal?.removeEventListener('abort', onAbort);
    };

    reader.onerror = () => {
      removeAbortListener();
      if (!aborted) {
        logger.error('Failed to read file', { fileName: processedFile.name });
        reject(new Error("Failed to read file"));
      }
    };

    reader.onload = (event) => {
      if (aborted) return;

      img.onerror = () => {
        removeAbortListener();
        if (!aborted) {
          logger.error('Failed to load image', { fileName: processedFile.name });
          reject(new Error("Failed to load image"));
        }
      };

      img.onload = () => {
        removeAbortListener();
        if (aborted) return;

        const MAX_DIMENSION = 1536;
        const HUGE_FILE_THRESHOLD = 500 * 1024;  // 500KB - keeps payloads stable for Pro model

        let width = img.width;
        let height = img.height;
        let shouldResize = false;
        const isPng = processedFile.type === 'image/png';

        if (processedFile.size > HUGE_FILE_THRESHOLD || width > MAX_DIMENSION || height > MAX_DIMENSION || isPng) {
          shouldResize = true;
          if (width > height) {
            if (width > MAX_DIMENSION) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            }
          } else {
            if (height > MAX_DIMENSION) {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }
          logger.info('Resizing large image', {
            fileName: processedFile.name,
            originalSize: processedFile.size,
            newDimensions: { width, height }
          });
        }

        if (shouldResize) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            logger.error('Could not get canvas context');
            reject(new Error("Could not get canvas context"));
            return;
          }
          // Fill with white to prevent black backgrounds when converting transparent PNGs to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64Data = dataUrl.split(',')[1];
          const payloadSizeKB = Math.round(base64Data.length / 1024);
          logger.info('Image processed (resized)', {
            fileName: processedFile.name,
            dimensions: { width, height },
            payloadSizeKB,
            mimeType: 'image/jpeg'
          });

          resolve({
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg'
            }
          });
        } else {
          const base64Data = (reader.result as string).split(',')[1];
          const payloadSizeKB = Math.round(base64Data.length / 1024);
          logger.info('Image processed (no resize needed)', {
            fileName: processedFile.name,
            dimensions: { width: img.width, height: img.height },
            payloadSizeKB,
            mimeType: processedFile.type
          });
          resolve({
            inlineData: {
              data: base64Data,
              mimeType: processedFile.type
            }
          });
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(processedFile);
  });
}

/**
 * Attempt to correct malformed JSON by asking the model to fix it
 */
async function correctMalformedJson(
  model: GenerativeModel,
  malformedJson: string,
  issues: string[],
  signal?: AbortSignal
): Promise<string> {
  const correctionPrompt = `The following JSON response has structural issues:

ISSUES:
${issues.map(i => `- ${i}`).join('\n')}

MALFORMED JSON:
\`\`\`json
${malformedJson}
\`\`\`

Please fix the JSON to match this exact structure. Use empty string "" for missing text fields and empty array [] for missing array fields. Output ONLY the corrected JSON, no explanation:

{
  "meta": { "intent": "", "aspect_ratio": "", "quality": "" },
  "subject": { "archetype": "", "description": "", "expression": "", "pose": "", "attire": "" },
  "scene": { "setting": "", "atmosphere": "", "elements": [] },
  "technical": { "shot": "", "lens": "", "lighting": "", "render": "" },
  "palette": { "colors": [], "mood": "" },
  "details": { "textures": [], "accents": [] },
  "negative": "",
  "text_content": { "overlay": "", "style": "" }
}`;

  return generateWithRetry(model, [{ text: correctionPrompt }], 1, signal, undefined, 'correction');
}

/**
 * Parse and validate JSON with self-correction loop
 */
async function parseAndValidateJson(
  jsonText: string,
  genAI: GoogleGenerativeAI,
  signal?: AbortSignal,
  maxCorrections: number = 2
): Promise<ImageMetadata> {
  let currentText = jsonText;

  // Use Flash for corrections (fast, cheap)
  const correctionModel = genAI.getGenerativeModel({
    model: FALLBACK_MODEL,
    generationConfig: { responseMimeType: "application/json" },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
    ]
  });

  for (let attempt = 0; attempt <= maxCorrections; attempt++) {
    checkAborted(signal);

    let parsed: unknown;
    try {
      parsed = JSON.parse(currentText);

      // Handle multi-image responses (Gemini returns array of analyses)
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          throw new Error("Empty analysis array returned");
        }
        logger.info('Multi-image response detected, using first analysis', { count: parsed.length });
        parsed = parsed[0];
      }
    } catch (e) {
      if (attempt >= maxCorrections) {
        logger.error("JSON Parse Error after corrections", { rawText: currentText.substring(0, 200) });
        throw new Error("Failed to parse stylistic analysis: The AI returned invalid JSON. Please try again.");
      }
      // Ask model to fix JSON syntax
      logger.warn(`JSON syntax error on attempt ${attempt + 1}, requesting correction`);
      currentText = await correctMalformedJson(correctionModel, currentText, ['Invalid JSON syntax'], signal);
      continue;
    }

    // JSON parsed successfully - normalize and return (missing sections become empty values)
    logger.info('JSON parsed successfully, normalizing', { attempts: attempt + 1 });
    return normalizeMetadata(parsed);
  }

  throw new Error("Failed to get valid response after multiple correction attempts.");
}

/**
 * Get human-readable label for an image
 */
function getLabelText(label: ImageLabel): string {
  const option = IMAGE_LABEL_OPTIONS.find(opt => opt.type === label.type);
  return option?.label || 'General Reference';
}

/**
 * Build image context string from labels
 */
function buildImageContext(labels: ImageLabel[]): string {
  if (labels.length === 0) return '';

  const contextLines = labels.map((label, idx) => {
    return `[Image ${idx + 1} - ${getLabelText(label)}]`;
  });

  return contextLines.join('\n') + '\n\n';
}

/**
 * Compile metadata into MJ-optimized prompt
 * This is a separate LLM call that runs AFTER JSON extraction
 * Graceful failure: returns null on error, doesn't throw
 */
export async function compileMJPrompt(
  metadata: ImageMetadata,
  abortSignal?: AbortSignal,
  providedApiKey?: string,
  textModel?: string
): Promise<MJCompilerResult | null> {
  const modelToUse = textModel || FALLBACK_MODEL;

  logger.info('Starting MJ prompt compilation', { textModel: modelToUse });

  const apiKey = providedApiKey?.trim() || getStoredApiKey();

  if (!apiKey) {
    logger.warn('MJ compiler: API key missing, skipping');
    return null;
  }

  checkAborted(abortSignal);

  const genAI = new GoogleGenerativeAI(apiKey);

  // Build input prompt with the extracted metadata
  const inputPrompt = `Compile this metadata into an MJ prompt:\n\n${JSON.stringify(metadata, null, 2)}`;

  try {
    const result = await generateWithModel(
      genAI,
      modelToUse,
      MJ_COMPILER_SYSTEM_PROMPT,
      [{ text: inputPrompt }],
      { useJsonMode: true },
      abortSignal,
      undefined  // No progress callback for this secondary call
    );

    checkAborted(abortSignal);

    // Parse and validate the result
    let parsed: unknown;
    try {
      parsed = JSON.parse(result);
    } catch {
      logger.warn('MJ compiler returned invalid JSON', { result: result.substring(0, 200) });
      return null;
    }

    // Basic validation
    const data = parsed as Record<string, unknown>;
    if (typeof data.positive !== 'string' || !data.positive) {
      logger.warn('MJ compiler output missing positive prompt');
      return null;
    }

    // Validate segment count (6-8)
    const segments = data.positive.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (segments.length < 6 || segments.length > 8) {
      logger.warn('MJ compiler output has incorrect segment count', {
        expected: '6-8',
        actual: segments.length
      });
      // Still return the result but log the warning
    }

    // Validate "in the style of" appears in position 2
    if (segments.length >= 2 && !segments[1].toLowerCase().includes('in the style of')) {
      logger.warn('MJ compiler output missing "in the style of" in second position');
      // Still return the result but log the warning
    }

    const mjResult: MJCompilerResult = {
      positive: data.positive,
      negative: typeof data.negative === 'string' ? data.negative : ''
    };

    logger.info('MJ prompt compilation complete', {
      positiveLength: mjResult.positive.length,
      negativeLength: mjResult.negative.length,
      segmentCount: segments.length
    });

    return mjResult;

  } catch (error) {
    // Graceful failure - log and return null, don't block main flow
    if ((error as Error).name === 'AbortError') {
      throw error; // Re-throw abort errors
    }
    logger.warn('MJ compiler failed, continuing without MJ prompt', {
      error: (error as Error).message
    });
    return null;
  }
}

export async function analyzeImages(
  files: File[],
  labels: ImageLabel[] = [],
  guidance?: string,
  abortSignal?: AbortSignal,
  onProgress?: AnalysisProgressCallback,
  providedApiKey?: string,
  textModel?: string
): Promise<{ json: ImageMetadata, description: string, mjPrompt: MJCompilerResult | null }> {
  const modelToUse = textModel || FALLBACK_MODEL;

  logger.info('Starting image analysis', {
    fileCount: files.length,
    hasGuidance: !!guidance,
    labelCount: labels.length,
    textModel: modelToUse,
    fallbackModel: FALLBACK_MODEL
  });

  const apiKey = providedApiKey?.trim() || getStoredApiKey();

  if (!apiKey) {
    logger.error('API Key is missing');
    throw new Error("API Key is missing. Please configure it in Settings.");
  }

  checkAborted(abortSignal);

  const genAI = new GoogleGenerativeAI(apiKey);

  logger.info('Processing images...');

  const imageParts = await withTimeout(
    Promise.all(files.map(file => fileToGenerativePart(file, abortSignal))),
    IMAGE_PROCESSING_TIMEOUT_MS,
    'image processing'
  );

  checkAborted(abortSignal);

  logger.info('Images processed, sending to API...');

  const imageContext = buildImageContext(labels);

  const guidanceContext = guidance
    ? `\n\n[USER DIRECTIVE]: ${guidance}\nINSTRUCTION: The User Directive above is ABSOLUTE. It overrides any default aesthetic assumptions.`
    : "";

  const jsonPrompt = `${imageContext}Analyze these images according to the schema.${guidanceContext}`;
  const descPrompt = guidance
    ? `${imageContext}Generate a visual description merging these images. Focus specifically on: ${guidance}`
    : `${imageContext}Generate the visual description.`;

  const jsonContent = [
    ...imageParts,
    { text: jsonPrompt }
  ];

  const descContent = [
    ...imageParts,
    { text: descPrompt }
  ];

  checkAborted(abortSignal);

  // Use Promise.allSettled to support partial results
  // If JSON succeeds but description fails, we can still return the JSON
  // Use the user-configured text model for both JSON extraction and description
  const results = await Promise.allSettled([
    // JSON: User-configured text model for structured output
    generateWithModel(
      genAI,
      modelToUse,
      JSON_SYSTEM_PROMPT,
      jsonContent,
      { useJsonMode: true },
      abortSignal,
      onProgress
    ),
    // Description: Same text model for consistency
    generateWithModel(
      genAI,
      modelToUse,
      DESC_SYSTEM_PROMPT,
      descContent,
      { useJsonMode: false },
      abortSignal,
      onProgress
    )
  ]);

  checkAborted(abortSignal);

  const jsonResult = results[0];
  const descResult = results[1];

  // JSON is required - if it failed, throw the error
  if (jsonResult.status === 'rejected') {
    // If both failed, include info about both errors
    if (descResult.status === 'rejected') {
      logger.error('Both JSON and description generation failed', {
        jsonError: jsonResult.reason?.message,
        descError: descResult.reason?.message
      });
    }
    throw jsonResult.reason;
  }

  const jsonText = jsonResult.value;
  const descText = descResult.status === 'fulfilled' ? descResult.value : null;

  // Log if description failed but JSON succeeded
  if (descResult.status === 'rejected') {
    logger.warn('Description generation failed, continuing with JSON only', {
      error: descResult.reason?.message
    });
  }

  logger.info('API responses received, parsing and validating JSON...');

  const parsedJson = await parseAndValidateJson(jsonText, genAI, abortSignal);

  const descriptionText = descText || "Description generation failed. Analysis data available above.";

  // Run MJ compilation (graceful failure - won't throw, returns null on error)
  logger.info('Starting MJ prompt compilation...');
  const mjPrompt = await compileMJPrompt(
    parsedJson,
    abortSignal,
    providedApiKey,
    textModel
  );

  logger.info('Analysis complete', {
    hasJson: !!parsedJson,
    hasDescription: !!descText,
    hasMJPrompt: !!mjPrompt,
    descriptionLength: descriptionText.length
  });

  return {
    json: parsedJson,
    description: descriptionText,
    mjPrompt
  };
}

/**
 * Helper function to generate image with Imagen model using :predict endpoint
 */
async function generateImageWithImagen(
  apiKey: string,
  modelName: string,
  prompt: string,
  abortSignal?: AbortSignal,
  timeoutMs: number = 60000
): Promise<ImageGenerationResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;
  const body = {
    instances: [{ prompt }],
    parameters: { aspectRatio: "1:1", sampleCount: 1 }
  };

  const maxRetries = RETRY_CONFIG.maxRetries;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    checkAborted(abortSignal);

    if (attempt > 0) {
      const backoffDelay = calculateBackoffDelay(attempt - 1);
      logger.info(`Imagen generation retry attempt ${attempt}/${maxRetries}`, {
        model: modelName,
        reason: lastError?.message,
        delayMs: Math.round(backoffDelay)
      });
      await delay(backoffDelay);
    }

    try {
      checkAborted(abortSignal);

      const fetchPromise = fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortSignal
      });

      const response = await withTimeout(fetchPromise, timeoutMs, 'Imagen generation');

      checkAborted(abortSignal);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Imagen API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.predictions?.[0]?.bytesBase64Encoded) {
        throw new Error("No image generated in Imagen response.");
      }

      const imageBase64 = data.predictions[0].bytesBase64Encoded;
      logger.info('Imagen image generated successfully', {
        model: modelName,
        dataLength: imageBase64.length,
        attempts: attempt + 1
      });

      return {
        imageBase64,
        mimeType: 'image/png'
      };
    } catch (err) {
      const error = err as Error;

      if (error.name === 'AbortError') {
        throw error;
      }

      const shouldRetry = error.name === 'TimeoutError' || isRetryableError(error);

      if (!shouldRetry || attempt >= maxRetries) {
        logger.error('Imagen generation failed', { model: modelName, error: error.message, attempts: attempt + 1 });
        throw error;
      }

      lastError = error;
      logger.warn(`Imagen generation attempt ${attempt + 1} failed (will retry)`, {
        model: modelName,
        error: error.message,
        isRetryable: shouldRetry
      });
    }
  }

  throw new Error("Imagen generation failed after multiple attempts. Please try again.");
}

/**
 * Helper function to generate image with Gemini model using SDK
 */
async function generateImageWithGemini(
  genAI: GoogleGenerativeAI,
  modelName: string,
  prompt: string,
  abortSignal?: AbortSignal,
  timeoutMs: number = 60000
): Promise<ImageGenerationResult> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
    generationConfig: {
      responseModalities: ["image", "text"],
    } as Record<string, unknown>,
  });

  const maxRetries = RETRY_CONFIG.maxRetries;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    checkAborted(abortSignal);

    if (attempt > 0) {
      const backoffDelay = calculateBackoffDelay(attempt - 1);
      logger.info(`Image generation retry attempt ${attempt}/${maxRetries}`, {
        model: modelName,
        reason: lastError?.message,
        delayMs: Math.round(backoffDelay)
      });
      await delay(backoffDelay);
    }

    try {
      checkAborted(abortSignal);

      const response = await withTimeout(
        model.generateContent([{ text: prompt }], { signal: abortSignal }),
        timeoutMs,
        'image generation'
      );

      checkAborted(abortSignal);

      const candidate = response.response.candidates?.[0];
      if (!candidate?.content?.parts) {
        throw new Error("No image generated in response. The model may not support image generation.");
      }

      // Find the inline data part (the generated image)
      for (const part of candidate.content.parts) {
        if ('inlineData' in part && part.inlineData) {
          logger.info('Image generated successfully', {
            model: modelName,
            mimeType: part.inlineData.mimeType,
            dataLength: part.inlineData.data.length,
            attempts: attempt + 1
          });
          return {
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType
          };
        }
      }

      throw new Error("Response did not contain generated image data.");
    } catch (err) {
      const error = err as Error;

      if (error.name === 'AbortError') {
        throw error;
      }

      const shouldRetry = error.name === 'TimeoutError' || isRetryableError(error);

      if (!shouldRetry || attempt >= maxRetries) {
        logger.error('Image generation failed', { model: modelName, error: error.message, attempts: attempt + 1 });
        throw error;
      }

      lastError = error;
      logger.warn(`Image generation attempt ${attempt + 1} failed (will retry)`, {
        model: modelName,
        error: error.message,
        isRetryable: shouldRetry
      });
    }
  }

  throw new Error("Image generation failed after multiple attempts. Please try again.");
}

/**
 * Helper function to generate image with a specific model
 * Routes to Imagen or Gemini based on model name
 */
async function generateImageWithModel(
  genAI: GoogleGenerativeAI,
  apiKey: string,
  modelName: string,
  prompt: string,
  abortSignal?: AbortSignal,
  timeoutMs: number = 60000
): Promise<ImageGenerationResult> {
  if (isImagenModel(modelName)) {
    return generateImageWithImagen(apiKey, modelName, prompt, abortSignal, timeoutMs);
  } else {
    return generateImageWithGemini(genAI, modelName, prompt, abortSignal, timeoutMs);
  }
}

/**
 * Generate an image from metadata using Gemini's image generation model.
 * Uses the JSON metadata directly as the prompt.
 * Falls back to Imagen model on timeout or service overload.
 */
export async function generateImageFromMetadata(
  metadata: ImageMetadata,
  abortSignal?: AbortSignal,
  providedApiKey?: string,
  imageModel?: string
): Promise<ImageGenerationResult> {
  const modelToUse = imageModel || PRIMARY_IMAGE_MODEL;

  logger.info('Starting image generation from metadata', { imageModel: modelToUse });

  const apiKey = providedApiKey?.trim() || getStoredApiKey();

  if (!apiKey) {
    logger.error('API Key is missing');
    throw new Error("API Key is missing. Please configure it in Settings.");
  }

  checkAborted(abortSignal);

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use the JSON metadata directly as the prompt
  const prompt = `Generate an image based on this visual metadata:\n\n${JSON.stringify(metadata, null, 2)}`;

  logger.debug('Image generation prompt created', { promptLength: prompt.length });

  checkAborted(abortSignal);

  // Try user-configured model first with 3-minute timeout
  try {
    return await generateImageWithModel(
      genAI,
      apiKey,
      modelToUse,
      prompt,
      abortSignal,
      IMAGE_GEN_FALLBACK_TIMEOUT_MS
    );
  } catch (error) {
    // Fallback to Imagen on timeout or service overload
    if (isTimeoutError(error) || isServiceOverloadError(error)) {
      logger.warn(`${modelToUse} failed, falling back to ${FALLBACK_IMAGE_MODEL}`, {
        error: (error as Error).message,
        isTimeout: isTimeoutError(error),
        isOverload: isServiceOverloadError(error)
      });

      return await generateImageWithModel(
        genAI,
        apiKey,
        FALLBACK_IMAGE_MODEL,
        prompt,
        abortSignal,
        60000  // 60 seconds for fallback model
      );
    }

    // Non-retryable error, rethrow with user-friendly message
    throw new Error(`Image generation failed: ${(error as Error).message}`);
  }
}
