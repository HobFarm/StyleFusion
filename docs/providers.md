# Generation Providers

StyleFusion routes to multiple AI generation providers simultaneously. The same creative intent, expressed through the same Intermediate Representation and Creative Slots compilation, renders differently across models. That's the point: you compare and choose.

## Image Generation

### Nano Banana 2
**Model:** Google Gemini 3.1 Flash Image
**Strengths:** Fast generation, strong photographic realism, good color accuracy. The default provider for most workflows.
**Best for:** Portraits, product shots, architectural scenes, anything where photographic fidelity matters.

### Nano Banana Pro
**Model:** Google Gemini 3 Pro Image
**Strengths:** Higher detail ceiling than Flash, better at complex multi-subject compositions, more nuanced lighting.
**Best for:** Dense scenes, editorial photography, images where subtle tonal relationships carry the composition.

### GPT Image
**Model:** OpenAI GPT Image
**Strengths:** Strong conceptual understanding, handles abstract and metaphorical prompts well, distinctive rendering style.
**Best for:** Creative and conceptual work, illustrations, scenes that benefit from interpretive rather than literal rendering.

### Grok Imagine
**Model:** xAI Grok Imagine
**Strengths:** Distinctive aesthetic, good at stylized and cinematic compositions, strong character rendering.
**Best for:** Character art, cinematic frames, stylized compositions that lean into a specific visual voice.

### Flux 2 Flex
**Platform:** fal.ai
**Strengths:** High consistency, strong prompt adherence, clean compositions.
**Best for:** Design work, brand assets, images where precision and consistency outweigh artistic interpretation.

### Flux Kontext Pro
**Platform:** fal.ai
**Strengths:** Context-aware generation, strong at maintaining visual coherence across related images.
**Best for:** Series work, character consistency, projects requiring visual continuity.

### Seedream 4.5
**Platform:** fal.ai
**Strengths:** Excellent detail rendering, strong at natural textures and materials.
**Best for:** Product photography, nature scenes, images where material quality is central.

### ComfyUI
**Platform:** Local GPU or RunPod (cloud)
**Strengths:** Full workflow customization, access to community models and LoRAs, no content restrictions.
**Best for:** Specialized workflows, fine-tuned models, experimental generation, NSFW-capable when needed.

## Video Generation (In Development)

### Veo 3.1
**Provider:** Google
**Status:** Integration in progress.

### Kling 3.0 Pro
**Provider:** Kuaishou
**Status:** Integration in progress.

### Sora 2 Pro
**Provider:** OpenAI
**Status:** Integration in progress.

## Extraction Models

Extraction models don't generate images. They analyze reference images and produce the Intermediate Representation (IR) that drives everything downstream.

### Gemini 3 Flash
The default extraction model. Fast, cost-effective, handles the majority of reference types well. Processes a typical reference in under 2 seconds.

### Gemini 3 Pro
Reserved for complex scenes: dense multi-subject compositions, images with layered lighting, references where subtle visual relationships need to be captured precisely. Slower and more expensive, but catches nuances Flash may simplify.

The system auto-selects based on scene complexity, though users can force Pro extraction when needed.

## Provider Routing

All AI calls route through Cloudflare AI Gateway, which provides:

- **Logging:** Every request and response recorded for debugging and analytics.
- **Caching:** Identical requests served from cache, reducing cost and latency.
- **Fallbacks:** If a provider is down or rate-limited, requests can route to alternatives.
- **Observability:** Token usage, latency, and cost tracking across all providers.

The MEDIATE phase selects providers. No other phase in the pipeline knows or cares which model generates the output. This abstraction means new providers can be added without touching any generation logic.

## Adding Providers

StyleFusion's provider abstraction is designed for a rapidly changing landscape. New image and video models appear constantly. The architecture treats providers as pluggable endpoints behind a unified interface, so integrating a new model means implementing a prompt compiler for that provider's format and registering it with the routing layer.

The Grimoire vocabulary and Creative Slots compilation are provider-agnostic. They produce a structured creative intent that gets translated per-provider at the last possible moment.
