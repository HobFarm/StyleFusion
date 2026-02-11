# StyleFusion

AI-powered image analysis and structured prompt compiler. Upload reference images, extract detailed metadata schemas, and generate provider-specific prompts for consistent results across Midjourney, DALL-E, Gemini, Grok, and more.

**Live at [stylefusion.hob.farm](https://stylefusion.hob.farm)**

## What It Does

Most AI image generation relies on freeform prompting: you describe what you want in natural language and hope the model interprets it correctly. Results are inconsistent across providers, unreproducible, and drift over time. StyleFusion solves this with structured metadata extraction.

Upload a reference image. StyleFusion analyzes it and produces a JSON schema capturing every visual attribute: composition, lighting, color palette, texture, mood, subject positioning, and negative constraints. That schema becomes the contract. Feed it to any supported provider and get consistent, reproducible output.

The key insight: negative constraints matter as much as positive descriptions. StyleFusion doesn't just describe what's in an image. It locks down what should NOT appear, preventing the drift that kills consistency across generations.

```json
{
  "style": "atomic-noir",
  "lighting": {
    "primary": "chiaroscuro-industrial",
    "negative": "flat-even-soft"
  },
  "palette": {
    "dominant": "#1a1a1a",
    "accent": "#8b5cf6"
  },
  "composition": {
    "type": "authority-geometry",
    "negative": "centered-symmetrical-pastoral"
  },
  "locked": true
}
```

## Architecture

StyleFusion follows the Fusion Engine pipeline pattern:

```
INPUT --> COMPILE --> ROUTE --> EXECUTE --> REVIEW --> OUTPUT
```

1. **INPUT**: Reference image(s) uploaded by the user
2. **COMPILE**: Context assembly with analysis parameters and provider targets
3. **ROUTE**: Task dispatched to the appropriate AI provider based on capability (Gemini for structured extraction, Claude for nuanced analysis)
4. **EXECUTE**: Image analysis produces structured metadata against a defined JSON schema
5. **REVIEW**: Human reviews and adjusts extracted attributes before prompt generation
6. **OUTPUT**: Provider-specific prompts generated from the validated schema

Server-side prompt construction is the core differentiator. The user never writes a prompt. They make visual decisions (accept, reject, adjust extracted attributes) and the system compiles optimized prompts per provider, accounting for each provider's syntax, strengths, and known drift patterns.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript, deployed on Cloudflare Pages |
| API | Cloudflare Workers |
| Database | Cloudflare D1 (credits, user state) |
| Storage | Cloudflare R2 (image assets, CDN) |
| AI Routing | Cloudflare AI Gateway (logging, caching, fallbacks) |
| AI Providers | Gemini (primary extraction), Claude (complex analysis), Grok (style/voice) |

Everything runs on the Cloudflare edge. No origin servers, no cold starts for cached routes, global distribution by default.

## Schema-First Methodology

Every AI interaction in StyleFusion is governed by a JSON contract defined before execution begins. The model receives a schema specifying exactly what output shape is expected. This prevents hallucination, ensures parseable results, and makes the entire pipeline composable and testable.

This principle extends across all HobFarm products: define the data shape first, then build to the contract. Types drive implementation, not the other way around.

## Provider Abstraction

StyleFusion treats AI providers as interchangeable backends behind a unified interface. Adding a new provider means implementing a single adapter: how to format the prompt for that provider's syntax and how to parse its response back into the shared schema.

Current providers each have characteristic drift patterns that the system actively mitigates through provider-aware prompt sanitization. The same schema produces subtly different prompts per provider, compensating for known biases.

## Cross-Provider Consistency

The gallery at [hob.farm/gallery](https://hob.farm/gallery/) demonstrates the same schema fed to multiple providers side by side. Same structured input, consistent visual output across Gemini, ChatGPT, Midjourney, and Grok. This is what schema-first methodology looks like in practice.

## Development

```bash
# Clone
git clone https://github.com/HobFarm/StyleFusion.git
cd StyleFusion

# Install dependencies
npm install

# Configure environment
# Add API keys via Cloudflare dashboard Settings > Variables

# Local development
npx wrangler pages dev

# Deploy
npx wrangler pages deploy
```

## Status

StyleFusion is live in beta with tiered pricing planned:

| Tier | Credits | Price |
|------|---------|-------|
| Creator | 50 fusions/mo | $12/mo |
| Studio | 150 fusions/mo | $29/mo |
| Agency | 500 fusions/mo | $79/mo |

Credit packs available for overflow usage.

## Part of HobFarm

StyleFusion is one component of the [HobFarm](https://hob.farm) ecosystem: AI tools built on the principle of invisible labor, visible results. Same architecture, same methodology, applied across image analysis, content generation, and autonomous agents.

## License

MIT
