import { ImageMetadata, MJCompilerResult } from '../types';

export function formatAsText(data: ImageMetadata): string {
  let text = '=== StyleFusion Metadata Export ===\n';
  text += `Generated: ${new Date().toLocaleString()}\n\n`;

  // Meta & Intent
  text += '--- META & INTENT ---\n';
  if (data.meta.intent) text += `Intent: ${data.meta.intent}\n`;
  if (data.subject.archetype) text += `Archetype: ${data.subject.archetype}\n`;
  if (data.meta.quality) text += `Quality: ${data.meta.quality}\n`;
  if (data.meta.aspect_ratio) text += `Aspect Ratio: ${data.meta.aspect_ratio}\n`;

  // Subject
  text += '\n--- SUBJECT DETAILS ---\n';
  if (data.subject.description) text += `Description: ${data.subject.description}\n`;
  if (data.subject.expression) text += `Expression: ${data.subject.expression}\n`;
  if (data.subject.pose) text += `Pose: ${data.subject.pose}\n`;
  if (data.subject.attire) text += `Attire: ${data.subject.attire}\n`;

  // Scene
  text += '\n--- SCENE & ATMOSPHERE ---\n';
  if (data.scene.setting) text += `Setting: ${data.scene.setting}\n`;
  if (data.scene.atmosphere) text += `Atmosphere: ${data.scene.atmosphere}\n`;
  if (data.scene.elements?.length) text += `Elements: ${data.scene.elements.join(', ')}\n`;

  // Technical
  text += '\n--- TECHNICAL SPECS ---\n';
  if (data.technical.shot) text += `Shot: ${data.technical.shot}\n`;
  if (data.technical.lens) text += `Lens: ${data.technical.lens}\n`;
  if (data.technical.lighting) text += `Lighting: ${data.technical.lighting}\n`;
  if (data.technical.render) text += `Render: ${data.technical.render}\n`;

  // Palette
  text += '\n--- PALETTE & MOOD ---\n';
  if (data.palette.mood) text += `Mood: ${data.palette.mood}\n`;
  if (data.palette.colors?.length) text += `Colors: ${data.palette.colors.join(', ')}\n`;

  // Details
  text += '\n--- DETAILS & TEXTURES ---\n';
  if (data.details.textures?.length) text += `Textures: ${data.details.textures.join(', ')}\n`;
  if (data.details.accents?.length) text += `Accents: ${data.details.accents.join(', ')}\n`;

  // Text Content
  if (data.text_content?.overlay && data.text_content.overlay !== "None") {
    text += '\n--- TEXT CONTENT ---\n';
    text += `Overlay: ${data.text_content.overlay}\n`;
    if (data.text_content.style) text += `Font Style: ${data.text_content.style}\n`;
  }

  // Negative
  if (data.negative) {
    text += '\n--- NEGATIVE PROMPT ---\n';
    text += `${data.negative}\n`;
  }

  return text;
}

/**
 * Format all generated content as a complete text export
 */
export function formatAllAsText(
  description: string | null,
  metadata: ImageMetadata,
  mjCompilerResult: MJCompilerResult | null
): string {
  let text = '=== StyleFusion Complete Export ===\n';
  text += `Generated: ${new Date().toLocaleString()}\n`;

  // Generative Description
  text += '\n━━━ GENERATIVE DESCRIPTION ━━━\n';
  text += description ? `${description}\n` : '(No description generated)\n';

  // Midjourney Prompt (only if available)
  if (mjCompilerResult) {
    text += '\n━━━ MIDJOURNEY PROMPT ━━━\n\n';
    text += `POSITIVE:\n${mjCompilerResult.positive}\n\n`;
    text += `NEGATIVE:\n${mjCompilerResult.negative}\n`;
  }

  // Structured Metadata
  text += '\n━━━ STRUCTURED METADATA ━━━\n';
  text += formatAsText(metadata);

  return text;
}

/**
 * Format all generated content as a complete JSON export
 */
export function formatAllAsJson(
  description: string | null,
  metadata: ImageMetadata,
  mjCompilerResult: MJCompilerResult | null
): string {
  const exportData = {
    generated: new Date().toISOString(),
    description: description || null,
    mjPrompt: mjCompilerResult ? {
      positive: mjCompilerResult.positive,
      negative: mjCompilerResult.negative
    } : null,
    metadata: metadata
  };

  return JSON.stringify(exportData, null, 2);
}
