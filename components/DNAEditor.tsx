import React, { useState, useCallback, useMemo } from 'react';
import { SubjectIdentity, IdentityColor, FaceGeometry, HairSpecifics } from '../types';

interface DNAEditorProps {
  identity: SubjectIdentity;
  onChange: (identity: SubjectIdentity) => void;
  onClose: () => void;
  onSaveToLibrary?: () => void;
}

// Predefined options for dropdowns
const FACE_SHAPE_OPTIONS = [
  '', 'oval', 'heart-shaped', 'square', 'round', 'diamond', 'oblong', 'rectangular',
  'heart-shaped with soft jaw', 'square with soft features', 'angular'
];

const EYE_SHAPE_OPTIONS = [
  '', 'almond', 'round', 'hooded', 'monolid', 'deep-set', 'upturned', 'downturned',
  'almond, slightly upturned', 'wide-set almond', 'close-set round'
];

const BROW_STYLE_OPTIONS = [
  '', 'natural arch', 'straight', 'S-shaped', 'rounded', 'angled',
  'natural arch, medium thickness', 'straight, thick', 'arched, thin'
];

const NOSE_SHAPE_OPTIONS = [
  '', 'straight bridge', 'roman', 'button', 'aquiline', 'snub', 'wide', 'narrow',
  'straight bridge, refined tip', 'button, slightly upturned'
];

const LIP_SHAPE_OPTIONS = [
  '', 'full', 'thin', "cupid's bow", 'wide', 'heart-shaped',
  "full, cupid's bow", 'thin, defined', 'full, balanced'
];

const HAIR_LENGTH_OPTIONS = [
  '', 'pixie', 'short', 'chin-length', 'chin-length bob', 'shoulder-length',
  'mid-back', 'waist-length', 'longer'
];

const HAIR_WAVE_OPTIONS = [
  '', 'pin-straight', 'straight', 'wavy', 'loose waves', 'loose vintage waves',
  'curly', 'tight curls', 'coily', 'kinky'
];

const HAIR_PART_OPTIONS = [
  '', 'center', 'left', 'right', 'deep-side left', 'deep-side right', 'none'
];

const SPECIES_OPTIONS = [
  'human', 'feline', 'canine', 'android', 'robot', 'elf', 'vampire', 'demon', 'angel', 'alien'
];

const DNAEditor: React.FC<DNAEditorProps> = ({ identity, onChange, onClose, onSaveToLibrary }) => {
  const [localIdentity, setLocalIdentity] = useState<SubjectIdentity>({ ...identity });
  const [newFeature, setNewFeature] = useState('');
  const [newNegative, setNewNegative] = useState('');

  // Update a specific field
  const updateField = useCallback(<K extends keyof SubjectIdentity>(
    field: K,
    value: SubjectIdentity[K]
  ) => {
    setLocalIdentity(prev => ({ ...prev, [field]: value }));
  }, []);

  // Update color field
  const updateColor = useCallback((
    colorField: 'primaryColor' | 'secondaryColor' | 'accentColor',
    updates: Partial<IdentityColor>
  ) => {
    setLocalIdentity(prev => ({
      ...prev,
      [colorField]: { ...prev[colorField], ...updates }
    }));
  }, []);

  // Update face geometry field
  const updateFaceGeometry = useCallback((field: keyof FaceGeometry, value: string) => {
    setLocalIdentity(prev => ({
      ...prev,
      faceGeometry: {
        faceShape: prev.faceGeometry?.faceShape || '',
        eyeShape: prev.faceGeometry?.eyeShape || '',
        browStyle: prev.faceGeometry?.browStyle || '',
        noseShape: prev.faceGeometry?.noseShape || '',
        lipShape: prev.faceGeometry?.lipShape || '',
        [field]: value
      }
    }));
  }, []);

  // Update hair specifics field
  const updateHairSpecifics = useCallback((field: keyof HairSpecifics, value: string) => {
    setLocalIdentity(prev => ({
      ...prev,
      hairSpecifics: {
        hairLength: prev.hairSpecifics?.hairLength || '',
        hairWave: prev.hairSpecifics?.hairWave || '',
        hairPart: prev.hairSpecifics?.hairPart || '',
        [field]: value
      }
    }));
  }, []);

  // Add distinguishing feature
  const addFeature = useCallback(() => {
    if (newFeature.trim()) {
      setLocalIdentity(prev => ({
        ...prev,
        distinguishingFeatures: [...prev.distinguishingFeatures, newFeature.trim()]
      }));
      setNewFeature('');
    }
  }, [newFeature]);

  // Remove distinguishing feature
  const removeFeature = useCallback((index: number) => {
    setLocalIdentity(prev => ({
      ...prev,
      distinguishingFeatures: prev.distinguishingFeatures.filter((_, i) => i !== index)
    }));
  }, []);

  // Add identity negative
  const addNegative = useCallback(() => {
    if (newNegative.trim()) {
      setLocalIdentity(prev => ({
        ...prev,
        identityNegatives: [...(prev.identityNegatives || []), newNegative.trim()]
      }));
      setNewNegative('');
    }
  }, [newNegative]);

  // Remove identity negative
  const removeNegative = useCallback((index: number) => {
    setLocalIdentity(prev => ({
      ...prev,
      identityNegatives: (prev.identityNegatives || []).filter((_, i) => i !== index)
    }));
  }, []);

  // Generate preview identity lock string
  const identityLockPreview = useMemo(() => {
    const parts: string[] = [];
    if (localIdentity.species) parts.push(localIdentity.species);
    if (localIdentity.estimatedAge) parts.push(localIdentity.estimatedAge);
    if (localIdentity.faceGeometry?.faceShape) parts.push(`${localIdentity.faceGeometry.faceShape} face`);
    if (localIdentity.primaryColor.description) parts.push(`${localIdentity.primaryColor.description} eyes`);
    if (localIdentity.secondaryColor.description) parts.push(`${localIdentity.secondaryColor.description} skin`);
    const hairParts: string[] = [];
    if (localIdentity.hairSpecifics?.hairLength) hairParts.push(localIdentity.hairSpecifics.hairLength);
    if (localIdentity.hairSpecifics?.hairWave) hairParts.push(localIdentity.hairSpecifics.hairWave);
    if (localIdentity.accentColor.description) hairParts.push(localIdentity.accentColor.description);
    if (hairParts.length) parts.push(`${hairParts.join(' ')} hair`);
    return parts.length ? `[IDENTITY: ${parts.join(', ')}]` : '[IDENTITY: incomplete]';
  }, [localIdentity]);

  // Apply changes
  const handleApply = useCallback(() => {
    onChange(localIdentity);
    onClose();
  }, [localIdentity, onChange, onClose]);

  // Reset to original
  const handleReset = useCallback(() => {
    setLocalIdentity({ ...identity });
  }, [identity]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-purple-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
            </svg>
            Edit Character DNA
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Identity Lock Preview */}
          <div className="p-3 bg-purple-900/20 border border-purple-800/30 rounded-lg">
            <span className="text-xs text-purple-400 block mb-1">Identity Lock Preview</span>
            <code className="text-sm text-purple-200 break-all">{identityLockPreview}</code>
          </div>

          {/* Classification */}
          <EditorSection title="Classification">
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Species"
                value={localIdentity.species}
                options={SPECIES_OPTIONS}
                onChange={(v) => updateField('species', v)}
                allowCustom
              />
              <TextField
                label="Age"
                value={localIdentity.estimatedAge}
                onChange={(v) => updateField('estimatedAge', v)}
                placeholder="e.g., mid-20s"
              />
            </div>
          </EditorSection>

          {/* Colors */}
          <EditorSection title="Colors">
            <div className="space-y-3">
              <ColorField
                label="Eyes (Primary)"
                color={localIdentity.primaryColor}
                onChange={(c) => updateColor('primaryColor', c)}
              />
              <ColorField
                label="Skin (Secondary)"
                color={localIdentity.secondaryColor}
                onChange={(c) => updateColor('secondaryColor', c)}
              />
              <ColorField
                label="Hair (Accent)"
                color={localIdentity.accentColor}
                onChange={(c) => updateColor('accentColor', c)}
              />
            </div>
          </EditorSection>

          {/* Face Geometry */}
          <EditorSection title="Face Geometry">
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Face Shape"
                value={localIdentity.faceGeometry?.faceShape || ''}
                options={FACE_SHAPE_OPTIONS}
                onChange={(v) => updateFaceGeometry('faceShape', v)}
                allowCustom
              />
              <SelectField
                label="Eye Shape"
                value={localIdentity.faceGeometry?.eyeShape || ''}
                options={EYE_SHAPE_OPTIONS}
                onChange={(v) => updateFaceGeometry('eyeShape', v)}
                allowCustom
              />
              <SelectField
                label="Brow Style"
                value={localIdentity.faceGeometry?.browStyle || ''}
                options={BROW_STYLE_OPTIONS}
                onChange={(v) => updateFaceGeometry('browStyle', v)}
                allowCustom
              />
              <SelectField
                label="Nose Shape"
                value={localIdentity.faceGeometry?.noseShape || ''}
                options={NOSE_SHAPE_OPTIONS}
                onChange={(v) => updateFaceGeometry('noseShape', v)}
                allowCustom
              />
              <SelectField
                label="Lip Shape"
                value={localIdentity.faceGeometry?.lipShape || ''}
                options={LIP_SHAPE_OPTIONS}
                onChange={(v) => updateFaceGeometry('lipShape', v)}
                allowCustom
              />
            </div>
          </EditorSection>

          {/* Hair Specifics */}
          <EditorSection title="Hair Specifics">
            <div className="grid grid-cols-3 gap-3">
              <SelectField
                label="Length"
                value={localIdentity.hairSpecifics?.hairLength || ''}
                options={HAIR_LENGTH_OPTIONS}
                onChange={(v) => updateHairSpecifics('hairLength', v)}
                allowCustom
              />
              <SelectField
                label="Wave Pattern"
                value={localIdentity.hairSpecifics?.hairWave || ''}
                options={HAIR_WAVE_OPTIONS}
                onChange={(v) => updateHairSpecifics('hairWave', v)}
                allowCustom
              />
              <SelectField
                label="Part"
                value={localIdentity.hairSpecifics?.hairPart || ''}
                options={HAIR_PART_OPTIONS}
                onChange={(v) => updateHairSpecifics('hairPart', v)}
              />
            </div>
          </EditorSection>

          {/* Structure & Texture */}
          <EditorSection title="Structure & Texture">
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Structure"
                value={localIdentity.structure}
                onChange={(v) => updateField('structure', v)}
                placeholder="e.g., slim build, athletic"
              />
              <TextField
                label="Texture"
                value={localIdentity.texture}
                onChange={(v) => updateField('texture', v)}
                placeholder="e.g., smooth skin, freckles"
              />
            </div>
          </EditorSection>

          {/* Distinguishing Features */}
          <EditorSection title="Distinguishing Features">
            <TagEditor
              tags={localIdentity.distinguishingFeatures}
              newTag={newFeature}
              onNewTagChange={setNewFeature}
              onAddTag={addFeature}
              onRemoveTag={removeFeature}
              placeholder="Add feature (e.g., scar on cheek)"
              tagColor="blue"
            />
          </EditorSection>

          {/* Identity Negatives */}
          <EditorSection title="Identity Negatives (things to avoid)">
            <TagEditor
              tags={localIdentity.identityNegatives || []}
              newTag={newNegative}
              onNewTagChange={setNewNegative}
              onAddTag={addNegative}
              onRemoveTag={removeNegative}
              placeholder="Add negative (e.g., angular jawline)"
              tagColor="red"
            />
          </EditorSection>

          {/* Identity Anchor */}
          <EditorSection title="Identity Anchor">
            <TextField
              label="Fixed Seed Phrase"
              value={localIdentity.fixedSeed}
              onChange={(v) => updateField('fixedSeed', v)}
              placeholder="e.g., moonlit violet sorceress"
            />
          </EditorSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Reset to Original
          </button>
          <div className="flex items-center gap-3">
            {onSaveToLibrary && (
              <button
                onClick={onSaveToLibrary}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                Save to Library
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components

const EditorSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-sm font-medium text-slate-300 mb-3">{title}</h3>
    {children}
  </div>
);

const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-xs text-slate-400 mb-1">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
    />
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allowCustom?: boolean;
}> = ({ label, value, options, onChange, allowCustom }) => {
  const [isCustom, setIsCustom] = useState(!options.includes(value) && value !== '');

  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {isCustom ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => { setIsCustom(false); onChange(''); }}
            className="px-2 text-slate-400 hover:text-slate-200"
            title="Use dropdown"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt || '(none)'}</option>
            ))}
          </select>
          {allowCustom && (
            <button
              onClick={() => setIsCustom(true)}
              className="px-2 text-slate-400 hover:text-slate-200"
              title="Enter custom value"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ColorField: React.FC<{
  label: string;
  color: IdentityColor;
  onChange: (color: Partial<IdentityColor>) => void;
}> = ({ label, color, onChange }) => (
  <div className="flex items-center gap-3">
    <input
      type="color"
      value={color.hex || '#888888'}
      onChange={(e) => onChange({ hex: e.target.value })}
      className="w-10 h-10 rounded cursor-pointer border border-slate-600"
    />
    <div className="flex-1">
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type="text"
        value={color.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Description (e.g., deep violet with blue undertones)"
        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
      />
    </div>
    <div className="text-xs text-slate-500 w-16 text-right">{color.hex || 'No hex'}</div>
  </div>
);

const TagEditor: React.FC<{
  tags: string[];
  newTag: string;
  onNewTagChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (index: number) => void;
  placeholder: string;
  tagColor: 'blue' | 'red';
}> = ({ tags, newTag, onNewTagChange, onAddTag, onRemoveTag, placeholder, tagColor }) => {
  const colorClasses = tagColor === 'red'
    ? 'bg-red-950/50 border-red-800/50 text-red-300'
    : 'bg-slate-800 border-slate-700 text-blue-200';

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => onNewTagChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddTag()}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={onAddTag}
          disabled={!newTag.trim()}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 rounded-md text-sm transition-colors"
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded text-xs ${colorClasses}`}
            >
              {tag}
              <button
                onClick={() => onRemoveTag(i)}
                className="hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default DNAEditor;
