# Creative Slots

Creative Slots is StyleFusion's prompt compilation architecture. It treats prompt construction as a structured compilation problem rather than a freeform writing task.

## The Problem with Prompt Engineering

Traditional prompt engineering is manual, fragile, and provider-specific. A prompt that works beautifully with one model may produce garbage with another. Knowledge lives in the prompter's head, not in a system. There's no way to systematically reproduce, iterate, or scale.

StyleFusion's answer: don't write prompts. Compile them.

## How Creative Slots Work

The Intermediate Representation (IR), extracted from reference images by Gemini, describes a scene across structured visual dimensions. Creative Slots organizes these dimensions into categorical slots, each governing a distinct aspect of the final image.

### Slot Categories

**Subject:** What the image depicts. People, objects, creatures, abstract forms. Includes physical attributes, pose, expression, and relationship to other subjects.

**Environment:** Where the scene takes place. Architecture, landscape, interior spaces, atmospheric conditions. Spatial relationships and depth cues.

**Lighting:** How light behaves in the scene. Direction, quality (hard/soft), color temperature, contrast ratios, shadow characteristics, time-of-day implications.

**Camera:** The virtual observer. Focal length, depth of field, angle, distance, lens characteristics. Whether the image feels like a 35mm street photograph or a medium-format studio portrait.

**Style:** The aesthetic framework. Art movement references, era markers, tonal mood, visual culture anchors. This is where the Grimoire arrangement profiles connect.

**Rendering:** How the image should be produced. Photographic realism, CGI perfection, painterly texture, illustration flatness. The adaptive render system detects this from references and sets rendering parameters accordingly.

### Slot Compilation Rules

Slots don't just concatenate. They interact:

**Priority:** When multiple references contribute to the same slot, resolution rules determine which wins. Subject attributes from a portrait reference override subject attributes from a landscape reference, for instance.

**Harmony:** The Grimoire Conductor scores atoms against the target arrangement's harmonic signature. Atoms that resonate get amplified. Atoms that clash get filtered. This isn't random; it's based on five measurable harmonic dimensions.

**Adaptation:** Different providers have different prompt structures, token limits, and conventions. The compiler translates the unified slot representation into provider-specific formats at the last possible moment.

## The Grimoire Connection

The Hob Grimoire is a vocabulary database with 157,000+ visual terms (atoms), each classified by category and scored across five harmonic dimensions:

| Dimension | Measures |
|-----------|----------|
| Hardness | Soft/organic to hard/geometric |
| Temperature | Cool to warm (emotional and chromatic) |
| Weight | Light/ethereal to heavy/grounded |
| Formality | Casual/raw to formal/refined |
| Era Affinity | Historical period resonance |

Arrangement profiles (Atomic Noir, Cyberpunk, Film Noir, Art Deco, and others) define target harmonic signatures. The Conductor selects atoms whose scores align with the target, producing enrichment that feels tonally coherent rather than random.

This is what separates StyleFusion from manual prompt engineering. A human might know that "chiaroscuro" fits a noir aesthetic. The Grimoire knows that across 157,000 terms, and it knows which specific terms harmonize with each other and which ones fight.

## The Director's Note

Creative Slots is a structured system, but creative work isn't always structured. The Director's Note provides freeform override capability at any point in the pipeline.

Want to shift the color palette without re-extracting? Add a Director's Note. Want to push a photographic composition toward surrealism? Director's Note. Want to specify something the IR couldn't capture from the reference? Director's Note.

The Note integrates into the compiled slots without replacing them. It's a steering input, not a replacement for the structured pipeline.

## Self-Enrichment

During extraction, StyleFusion encounters visual terms in references that may not exist in the Grimoire yet. These novel terms are submitted to the Grimoire for classification. Gemini classifies each term, assigns harmonic scores, and stores it.

The next time any user's prompt compilation runs, those terms are available. The vocabulary grows with every generation. Every reference image teaches the system something.

This loop is the core of StyleFusion's value proposition: the system gets smarter over time, and every user benefits from every other user's creative work.
