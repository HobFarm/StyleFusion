# Architecture Overview

StyleFusion is built on the Fractal Fusion Engine (FFE), HobFarm's universal data mediation architecture. The FFE sits between human intent and AI execution, ensuring models interact with structured data rather than raw input.

## The Core Principle

The same pattern repeats at every scale. A single image generation and a 50-image batch comparison follow identical six-phase structure. The difference is depth, not shape.

```
INGEST → INDEX → MEDIATE → EXECUTE → VALIDATE → DELIVER
```

## Phases in StyleFusion

### INGEST
User uploads reference images. The system accepts and normalizes input into typed payloads. No interpretation happens here; INGEST receives and structures.

### INDEX
Gemini extraction models parse reference images into an Intermediate Representation (IR). The IR captures visual structure across dozens of dimensions: subject description, scene composition, camera characteristics, lighting conditions, color relationships, style anchors, and rendering properties.

The adaptive render system detects whether a reference is photographic, CGI, illustration, or painterly, and adjusts extraction strategy for each mode. A photograph of a street scene and a watercolor painting of the same scene produce structurally different IRs, because the visual information that matters is different in each case.

### MEDIATE
The system selects resources for the task: which extraction model (Flash for speed, Pro for complex scenes), which generation providers, and which Grimoire arrangement profile. Provider selection considers the content characteristics, user preferences, and cost.

This is also where the Grimoire Conductor enters. The Conductor queries the visual vocabulary database for atoms that harmonically resonate with the target arrangement. Atoms are scored across five dimensions (hardness, temperature, weight, formality, era affinity) and grouped into categorical slots.

### EXECUTE
The Creative Slots compiler transforms the IR and Grimoire enrichment into provider-specific prompts. Each provider has different prompt conventions, token limits, and structural expectations. The compiler handles these translations so the creative intent stays consistent across providers.

Director's Note overrides are applied here, allowing freeform adjustments without rebuilding the full IR.

Multiple providers execute in parallel when batch generation is requested.

### VALIDATE
User reviews compiled prompts and generated output. Can regenerate with different parameters, switch providers, adjust the Director's Note, or approve the result.

On compound tasks (multi-reference blends, batch comparisons), validation is a required checkpoint. No fully automated complex output.

### DELIVER
Generated images are delivered to the user. Novel visual terms discovered during extraction are submitted to the Grimoire for classification, feeding the self-enrichment loop.

## Complexity Routing

Not every task needs the full recursive engine. The Complexity Gate evaluates each task after INGEST and routes accordingly:

**Simple path:** Single reference, single provider, linear execution. Phases run once in sequence.

**Compound path:** Multiple references, cross-reference blending, batch generation. The engine recurses, with phases spawning sub-phases. Budget controls (depth limits, token budgets, cost ceilings) prevent runaway execution.

## Infrastructure

Everything runs on Cloudflare's edge:

| Layer | Service |
|-------|---------|
| Hosting | Cloudflare Pages |
| Compute | Cloudflare Workers |
| Database | Cloudflare D1 (edge SQLite) |
| Storage | Cloudflare R2 |
| AI Routing | Cloudflare AI Gateway |
| Auth | Cloudflare Access |

No origin servers. The entire application runs at the edge, close to the user.

## Design Principles

**Schema-first:** Output shape is defined before execution begins. AI models produce structured data, not freeform text that needs parsing.

**Provider abstraction:** No phase except MEDIATE knows which AI model is being used. Providers can be added, removed, or swapped without touching execution logic.

**Context handles, not context injection:** For complex tasks, models get query interfaces to navigate data. They request what they need rather than receiving everything upfront.

**Fail partial, not silent:** If budget is exhausted mid-task, available results are returned and flagged as incomplete. The system never silently drops work.

**Human-in-the-loop:** Compound tasks always pass through validation. Automation handles structure; humans handle judgment.
