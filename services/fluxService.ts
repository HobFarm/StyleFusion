/**
 * FLUX.2 Image Generation Service
 *
 * Frontend service for calling the FLUX API endpoint with
 * support for reference image resizing and prompt adaptation.
 */

import { logger } from './loggingService';

export type FluxModel = 'klein-4b' | 'klein-9b' | 'dev';

export interface FluxGenerationOptions {
  prompt: string;
  model?: FluxModel;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  referenceImages?: File[];
  includeReferences?: boolean;
  abortSignal?: AbortSignal;
}

export interface FluxGenerationResult {
  imageBlob: Blob;
  mimeType: string;
}

/**
 * Resize an image to fit within 512x512 while preserving aspect ratio.
 * FLUX.2 dev model requires reference images to be ≤512x512.
 *
 * @param file - The image file to resize
 * @returns Base64 encoded JPEG string (without data URL prefix)
 */
async function resizeImageToFit512(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        // Fit within 512x512 while preserving aspect ratio
        const maxDim = 512;
        const scale = maxDim / Math.max(img.width, img.height);

        // Only resize if larger than max dimension
        const width = img.width > maxDim || img.height > maxDim
          ? Math.round(img.width * scale)
          : img.width;
        const height = img.width > maxDim || img.height > maxDim
          ? Math.round(img.height * scale)
          : img.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // White background for transparent images
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Return base64 without data URL prefix
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl.split(',')[1]);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Build prompt with reference image context prepended.
 * FLUX interprets input_image references based on index.
 *
 * @param basePrompt - The original prompt
 * @param referenceCount - Number of reference images
 * @returns Modified prompt with reference context
 */
function buildPromptWithReferences(basePrompt: string, referenceCount: number): string {
  if (referenceCount === 0) {
    return basePrompt;
  }

  if (referenceCount === 1) {
    return `Using the reference image as a style guide, generate: ${basePrompt}`;
  }

  // Multi-reference: subject from image 0, style from image 1
  return `Using the subject from image 0 and the style/mood from image 1, generate: ${basePrompt}`;
}

/**
 * Generate an image using FLUX.2 via the /api/flux endpoint.
 *
 * @param options - Generation options including prompt, model, and references
 * @returns Promise resolving to the generated image blob
 * @throws Error if generation fails or is aborted
 */
export async function generateFluxImage(
  options: FluxGenerationOptions
): Promise<FluxGenerationResult> {
  const {
    prompt,
    model = 'klein-9b',
    width = 1024,
    height = 1024,
    steps,
    guidance,
    seed,
    referenceImages = [],
    includeReferences = false,
    abortSignal
  } = options;

  logger.info('Starting FLUX image generation', {
    model,
    hasReferences: includeReferences && referenceImages.length > 0,
    referenceCount: includeReferences ? referenceImages.length : 0
  });

  // Prepare reference images if enabled (max 2 for subject + style)
  let processedReferences: { data: string; mimeType: string }[] = [];
  if (includeReferences && referenceImages.length > 0) {
    logger.info('Processing reference images', { count: Math.min(referenceImages.length, 2) });

    try {
      processedReferences = await Promise.all(
        referenceImages.slice(0, 2).map(async (file) => ({
          data: await resizeImageToFit512(file),
          mimeType: 'image/jpeg'
        }))
      );
    } catch (err) {
      logger.warn('Failed to process some reference images', { error: err });
      // Continue without references rather than failing completely
      processedReferences = [];
    }
  }

  // Build final prompt with reference context
  const finalPrompt = includeReferences && processedReferences.length > 0
    ? buildPromptWithReferences(prompt, processedReferences.length)
    : prompt;

  // Prepare request body
  const requestBody: Record<string, unknown> = {
    prompt: finalPrompt,
    model,
    width,
    height,
  };

  if (steps !== undefined) {
    requestBody.steps = steps;
  }
  if (guidance !== undefined && model === 'dev') {
    requestBody.guidance = guidance;
  }
  if (seed !== undefined) {
    requestBody.seed = seed;
  }
  if (processedReferences.length > 0) {
    requestBody.reference_images = processedReferences;
  }

  logger.info('Calling FLUX API', { model, promptLength: finalPrompt.length });

  // Call the API
  const response = await fetch('/api/flux', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: abortSignal
  });

  // Handle error responses
  if (!response.ok) {
    let errorMessage = `FLUX API error: ${response.status}`;

    try {
      const errorData = await response.json() as { error?: string; details?: string };
      errorMessage = errorData.error || errorMessage;
      if (errorData.details) {
        errorMessage += `: ${errorData.details}`;
      }
    } catch {
      // Response wasn't JSON, use status text
      errorMessage = `FLUX API error: ${response.status} ${response.statusText}`;
    }

    logger.error('FLUX generation failed', { status: response.status, error: errorMessage });
    throw new Error(errorMessage);
  }

  // Get the image blob
  const imageBlob = await response.blob();

  logger.info('FLUX image generated successfully', {
    model,
    size: imageBlob.size,
    type: imageBlob.type
  });

  return {
    imageBlob,
    mimeType: 'image/png'
  };
}
