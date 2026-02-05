/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages Function for FLUX.2 image generation via Workers AI
 *
 * POST /api/flux
 *
 * Request body (JSON):
 * {
 *   prompt: string (required)
 *   model: 'klein-4b' | 'klein-9b' | 'dev' (default: 'klein-9b')
 *   width: number (default: 1024)
 *   height: number (default: 1024)
 *   steps: number (model-dependent)
 *   guidance: number (dev model only, default: 3.5)
 *   seed: number (optional)
 *   reference_images: { data: string, mimeType: string }[] (optional, base64)
 * }
 *
 * Response: Raw PNG image bytes with Content-Type: image/png
 */

interface Env {
  AI: Ai;
}

// PagesFunction type for Cloudflare Pages
type PagesFunction<E = unknown> = (context: EventContext<E, string, unknown>) => Response | Promise<Response>;

interface FluxRequestBody {
  prompt: string;
  model?: 'klein-4b' | 'klein-9b' | 'dev';
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: number;
  reference_images?: { data: string; mimeType: string }[];
}

const MODEL_MAP: Record<string, string> = {
  'klein-4b': '@cf/black-forest-labs/flux-2-klein-4b',
  'klein-9b': '@cf/black-forest-labs/flux-2-klein-9b',
  'dev': '@cf/black-forest-labs/flux-2-dev'
};

const DEFAULT_STEPS: Record<string, number> = {
  'klein-4b': 4,
  'klein-9b': 4,
  'dev': 28
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Check AI binding is configured
  if (!context.env.AI) {
    // Debug: log what bindings are available
    const envKeys = Object.keys(context.env || {});
    return new Response(JSON.stringify({
      error: 'AI binding not configured',
      details: 'Add AI binding in Cloudflare Dashboard: Pages > Settings > Functions > AI Bindings',
      debug: {
        availableBindings: envKeys,
        hasEnv: !!context.env
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await context.request.json() as FluxRequestBody;

    // Validate required fields
    if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim() === '') {
      return new Response(JSON.stringify({
        error: 'Prompt is required',
        details: 'Request body must include a non-empty "prompt" field'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const modelKey = body.model || 'klein-9b';
    const modelId = MODEL_MAP[modelKey];

    if (!modelId) {
      return new Response(JSON.stringify({
        error: 'Invalid model',
        details: `Model must be one of: ${Object.keys(MODEL_MAP).join(', ')}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build FormData for multipart request
    const form = new FormData();
    form.append('prompt', body.prompt.trim());
    form.append('width', String(body.width || 1024));
    form.append('height', String(body.height || 1024));
    form.append('num_steps', String(body.steps || DEFAULT_STEPS[modelKey]));

    // Only dev model supports guidance
    if (modelKey === 'dev') {
      form.append('guidance', String(body.guidance ?? 3.5));
    }

    // Add seed if provided
    if (body.seed !== undefined && body.seed !== null) {
      form.append('seed', String(body.seed));
    }

    // Attach reference images as blobs
    if (body.reference_images && body.reference_images.length > 0) {
      for (let i = 0; i < body.reference_images.length; i++) {
        const img = body.reference_images[i];
        if (img.data && img.mimeType) {
          try {
            const binary = Uint8Array.from(atob(img.data), c => c.charCodeAt(0));
            form.append(`input_image_${i}`, new Blob([binary], { type: img.mimeType }));
          } catch {
            // Skip invalid base64 images
            console.warn(`Skipping invalid reference image at index ${i}`);
          }
        }
      }
    }

    // MUST use multipart wrapper - plain object won't work with FLUX models
    const formRequest = new Request('https://placeholder.com', {
      method: 'POST',
      body: form,
    });

    // Use type assertion - Workers AI types don't include multipart option but it's supported at runtime
    // See: https://developers.cloudflare.com/workers-ai/models/flux-2/
    const aiInput = {
      multipart: {
        body: formRequest.body,
        contentType: formRequest.headers.get('content-type'),
      },
    } as Parameters<typeof context.env.AI.run>[1];

    const response = await context.env.AI.run(modelId as keyof AiModels, aiInput);

    // Response is raw image bytes (ReadableStream or Uint8Array)
    // Cast to appropriate type for Response constructor
    return new Response(response as ReadableStream | Uint8Array, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('FLUX generation error:', error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return new Response(JSON.stringify({
        error: 'Invalid JSON',
        details: 'Request body must be valid JSON'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle Workers AI errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      error: 'Image generation failed',
      details: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
