<div align="center">
<a href="https://hob.farm"><img alt="Hob Farm Logo" src="assets/hobfarm-readme-logo.jpg" style="border-radius: 8px;" /></a>

# StyleFusion

**AI-Powered Visual Style Synthesis for Image Generation**

Transform visual references into production-ready prompts and structured metadata for AI image generators

</div>

---

## Overview

StyleFusion is a multimodal visual analysis tool that intelligently blends multiple images to generate structured JSON metadata and natural language descriptions optimized for AI image generators like Midjourney, Stable Diffusion, and Flux.

Instead of treating multiple reference images as separate inputs, StyleFusion performs **style fusion**—synthesizing visual elements from up to 3 images into a single cohesive scene description. Upload a lighting reference, a color palette, and a composition guide, and StyleFusion will intelligently merge them into unified, actionable prompts.

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Image Style Fusion** | Blend up to 3 images into a single cohesive synthesis—not a collage, but a unified scene |
| **Structured JSON Metadata** | 9-section schema capturing subject, scene, technical specs, palette, textures, and more |
| **Natural Language Descriptions** | AI-generated 4-6 sentence descriptions ready for image generators |
| **Dual Export Formats** | Universal format for any generator + Midjourney/SD optimized format |
| **Image Generation** | Generate new images directly from analyzed metadata using Gemini |
| **Broad Format Support** | JPEG, PNG, WebP, HEIC, HEIF with automatic conversion |
| **Robust Error Handling** | Exponential backoff retry, 3-minute timeout, user cancellation support |
| **Client-Side Logging** | Downloadable debug logs for troubleshooting |

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. UPLOAD          2. LABEL           3. ANALYZE         4. EXPORT        │
│  ─────────          ─────────          ──────────         ────────         │
│  Up to 3 images  →  Assign roles   →   AI synthesis  →   Copy prompts     │
│  (drag & drop)      (optional)         via Gemini        or generate       │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Upload** 1-3 reference images (JPEG, PNG, WebP, HEIC, or HEIF)
2. **Label** each image's role (style, color, composition, lighting, etc.) — optional but improves results
3. **Add guidance** with custom instructions like "emphasize dramatic lighting" — optional
4. **Generate analysis** to receive structured JSON metadata + natural language description
5. **Export** as Universal or SD/MJ format, or generate a new image from the metadata

---

## Quick Start

**Prerequisites:** Node.js

```bash
# 1. Install dependencies
npm install

# 2. Create environment file with your Gemini API key
echo VITE_GEMINI_API_KEY=your_api_key_here > .env.local

# 3. Start development server
npm run dev

# 4. Open in browser
# http://localhost:9005
```

> **Security Note:** This app runs entirely in the browser. Your API key will be visible in client-side code. For production deployment, implement a backend proxy to protect your credentials.

---

## Image Labels

When uploading images, you can optionally assign a role to guide the AI's analysis:

| Label | Purpose |
|-------|---------|
| **General Reference** | All-purpose reference (default) |
| **Style Reference** | Visual rendering style, artistic technique |
| **Composition Reference** | Layout, framing, spatial arrangement |
| **Color Reference** | Palette, color relationships, mood |
| **Subject Reference** | Subject details, character design, objects |
| **Texture Reference** | Materials, surfaces, tactile qualities |
| **Lighting Reference** | Light setup, shadows, atmosphere |

Labeling helps StyleFusion prioritize specific visual aspects from each image during synthesis.

---

## Output Schema

StyleFusion generates a comprehensive 9-section metadata schema:

```typescript
interface ImageMetadata {
  meta: {
    intent: string;           // Creative direction
    aspect_ratio: string;     // e.g., "16:9", "1:1"
    quality: string;          // e.g., "8k photorealistic"
  };
  subject: {
    archetype: string;        // e.g., "mysterious wanderer"
    description: string;      // Physical description
    expression: string;       // Emotional state
    pose: string;             // Body positioning
    attire: string;           // Clothing/accessories
  };
  scene: {
    setting: string;          // Location/environment
    atmosphere: string;       // Mood/ambiance
    elements: string[];       // Key environmental details
  };
  technical: {
    shot: string;             // e.g., "medium close-up"
    lens: string;             // e.g., "85mm f/1.4"
    lighting: string;         // Light description
    render: string;           // e.g., "photorealistic", "oil painting"
  };
  palette: {
    colors: string[];         // Hex codes with modifiers
    mood: string;             // Color mood description
  };
  details: {
    textures: string[];       // Surface qualities
    accents: string[];        // Decorative elements
  };
  style_fusion: {
    sources: string;          // Which image contributed what
    blend_notes: string;      // How styles were merged
  };
  negative: string;           // Auto-generated negative prompt
  text_content: {
    overlay: string;          // Any text in the image
    style: string;            // Typography style
  };
}
```

---

## Export Formats

### Universal Format

Comma-separated format compatible with any AI image generator:

```
cinematic portrait, 8k photorealistic, mysterious wanderer, weathered face
with deep eyes, ancient ruins at sunset, dramatic rim lighting, warm amber
and cool shadow, rough stone textures, volumetric fog
--neg blurry, low quality, cartoon, anime, watermark
```

- Includes all metadata sections
- Customizable section toggles in export modal
- Works with Midjourney, Stable Diffusion, Flux, DALL-E, and others

### SD/MJ Format

Optimized for Midjourney and Stable Diffusion using position-weighted grammar:

```
mysterious wanderer in ancient ruins at sunset, in the style of
photorealistic, dark amber and gold, weathered textures, dramatic
rim lighting, cinematic --ar 16:9 --no blurry, cartoon, watermark
```

**Structure:** `[SUBJECT], in the style of [STYLE], [COLORS], [SECONDARY], [TECHNICAL]`

- Position determines influence (leftmost = strongest)
- Optimal length: 5-8 elements
- Includes `--ar` (aspect ratio) and `--no` (negative) parameters
- Based on empirical analysis of Midjourney's describe feature

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2 | UI framework |
| TypeScript | 5.8 | Type safety |
| Vite | 6.2 | Build tool & dev server |
| Tailwind CSS | 4.1 | Styling |
| Google Gemini AI | 0.21 | Image analysis & generation |
| Vitest | 4.0 | Testing framework |

---

## Project Structure

```
StyleFusion/
├── App.tsx                     # Main application component
├── index.tsx                   # React entry point
├── types.ts                    # TypeScript type definitions
├── constants.ts                # Configuration & system prompts
│
├── components/
│   ├── FileUpload.tsx          # Drag-drop image upload with validation
│   ├── GuidanceInput.tsx       # User guidance/instructions input
│   ├── JsonDisplay.tsx         # Structured metadata viewer
│   ├── DescriptionDisplay.tsx  # Natural language output display
│   ├── ImageGenerator.tsx      # Generate images from metadata
│   └── PromptExport.tsx        # Export modal with format options
│
├── services/
│   ├── geminiService.ts        # Gemini API integration (analysis & generation)
│   └── loggingService.ts       # Client-side logging with download
│
├── utils/
│   ├── promptGenerators.ts     # Universal & SD/MJ prompt generation
│   ├── colorUtils.ts           # Color formatting utilities
│   ├── metadataNormalizers.ts  # JSON validation & normalization
│   └── textFormatters.ts       # Text formatting utilities
│
└── tests/                      # Vitest test suites
```

---

## Configuration

Key settings defined in `constants.ts`:

| Setting | Value | Description |
|---------|-------|-------------|
| `MAX_FILES` | 3 | Maximum images per analysis |
| `MAX_FILE_SIZE` | 50 MB | Maximum size per file |
| `ACCEPTED_TYPES` | JPEG, PNG, WebP, HEIC, HEIF | Supported image formats |
| `API_TIMEOUT_MS` | 180,000 (3 min) | Gemini API timeout |
| `RETRY_CONFIG.maxRetries` | 3 | Retry attempts for transient errors |
| `RETRY_CONFIG.baseDelayMs` | 3,000 | Base delay for exponential backoff |
| `RETRY_CONFIG.maxDelayMs` | 30,000 | Maximum retry delay |

---

## Scripts

```bash
npm run dev        # Start development server (http://localhost:9005)
npm run build      # Create production build
npm run preview    # Preview production build locally
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Cancel analysis / Close modal / Clear results |
| `Enter` | Submit (when focused on input) |

---

## Troubleshooting

**"API key not configured"**
- Ensure `.env.local` contains `VITE_GEMINI_API_KEY=your_key`
- Restart the dev server after adding the key

**"Request timed out"**
- Large images or complex analyses may take up to 3 minutes
- Try with smaller/fewer images
- Check your network connection

**"HEIC conversion failed"**
- HEIC/HEIF files are converted client-side; ensure sufficient memory
- Try converting to JPEG before upload as a workaround

**Download logs for debugging**
- Click the log icon in the UI to download session logs
- Logs include API calls, errors, and processing steps

---

<div align="center">

<a href="https://hob.farm"><img alt="Hob Farm" src="assets/hobfarm-readme-small-logo.jpg" style="border-radius: 8px;" /></a>

</div>
