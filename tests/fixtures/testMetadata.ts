import { ImageMetadata } from '../../types';

export const emptyMetadata: ImageMetadata = {
  meta: { intent: '', aspect_ratio: '', quality: '' },
  subject: { archetype: '', description: '', expression: '', pose: '', attire: '' },
  scene: { setting: '', atmosphere: '', elements: [] },
  technical: { shot: '', lens: '', lighting: '', render: '' },
  palette: { colors: [], mood: '' },
  details: { textures: [], accents: [] },
  negative: '',
  text_content: { overlay: '', style: '' },
};

export const completeMetadata: ImageMetadata = {
  meta: { intent: 'cinematic portrait', aspect_ratio: '16:9', quality: 'masterpiece, best quality' },
  subject: {
    archetype: 'mysterious wanderer',
    description: 'weathered face with deep eyes',
    expression: 'contemplative gaze',
    pose: 'standing tall',
    attire: 'tattered cloak and leather armor',
  },
  scene: {
    setting: 'ancient ruins at sunset',
    atmosphere: 'ethereal and melancholic',
    elements: ['crumbling pillars', 'scattered leaves', 'distant mountains'],
  },
  technical: {
    shot: 'medium close-up',
    lens: '85mm f/1.4',
    lighting: 'golden hour rim lighting',
    render: 'photorealistic',
  },
  palette: { colors: ['#8B4513', '#FFD700', '#4A4A4A'], mood: 'warm and dramatic' },
  details: { textures: ['weathered leather', 'rough stone'], accents: ['glowing runes', 'dust particles'] },
  negative: 'blurry, low quality, cartoon, anime',
  text_content: { overlay: 'None', style: '' },
};

export const partialMetadata: ImageMetadata = {
  ...emptyMetadata,
  meta: { intent: 'portrait', aspect_ratio: '', quality: '' },
  subject: { archetype: 'warrior', description: '', expression: '', pose: '', attire: '' },
};

export const metadataWithTextOverlay: ImageMetadata = {
  ...emptyMetadata,
  meta: { intent: 'poster design', aspect_ratio: '2:3', quality: 'high detail' },
  text_content: { overlay: 'EPIC ADVENTURE', style: 'bold sans-serif' },
};

export const metadataWithManyNegatives: ImageMetadata = {
  ...emptyMetadata,
  meta: { intent: 'clean portrait', aspect_ratio: '1:1', quality: 'professional' },
  negative: 'blurry, low quality, cartoon, anime, watermark, signature, text, ugly, deformed, disfigured, extra limbs',
};
