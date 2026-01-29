import React, { useState } from 'react';
import { ImageMetadata, IdentityColor, FaceGeometry, HairSpecifics, DNAConfidence } from '../types';
import { inferNegatives } from '../utils/driftMaps';

interface JsonDisplayProps {
  data: ImageMetadata;
}

const COLLAPSIBLE_SECTIONS = ['subject', 'scene', 'technical', 'details'] as const;

const JsonDisplay: React.FC<JsonDisplayProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(true);
  const [showDriftNegatives, setShowDriftNegatives] = useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (section: string) => {
    if (allExpanded) {
      // Exit "all expanded" mode - expand all except clicked section
      setExpandedSections(new Set(COLLAPSIBLE_SECTIONS.filter(s => s !== section)));
      setAllExpanded(false);
    } else {
      // Normal toggle
      const newSet = new Set(expandedSections);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      setExpandedSections(newSet);
    }
  };

  const isExpanded = (section: string) => allExpanded || expandedSections.has(section);

  const toggleExpandAll = () => {
    setAllExpanded(!allExpanded);
    setExpandedSections(new Set());
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-100">Structured Metadata</h3>
        </div>
        <button
          onClick={toggleExpandAll}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
        >
          {allExpanded ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
              Collapse All
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
              Expand All
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* COLUMN 1: Essence & Subject */}
        <div className="space-y-6">
          <Section title="Meta & Intent">
            <KeyValue label="Intent" value={data.meta.intent} />
            <KeyValue label="Archetype" value={data.subject.archetype} />
            <KeyValue label="Quality" value={data.meta.quality} />
            <KeyValue label="Aspect Ratio" value={data.meta.aspect_ratio} />
          </Section>

          <Section title="Subject Details" collapsible expanded={isExpanded('subject')} onToggle={() => toggleSection('subject')}>
            <KeyValue label="Description" value={data.subject.description} />
            <KeyValue label="Expression" value={data.subject.expression} />
            <KeyValue label="Pose" value={data.subject.pose} />
            <KeyValue label="Attire" value={data.subject.attire} />

            {/* Subject DNA Section */}
            {data.subject.identity && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-purple-400 uppercase tracking-wider font-medium flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
                    </svg>
                    Subject DNA
                    {data.subject.identity.confidence && (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {Math.round(data.subject.identity.confidence.overall * 100)}% confidence
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setShowDriftNegatives(!showDriftNegatives)}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                      showDriftNegatives
                        ? 'bg-red-900/50 text-red-300 border border-red-700/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300'
                    }`}
                    title="Show auto-inferred drift negatives for each attribute"
                  >
                    {showDriftNegatives ? 'Hide Drift' : 'Show Drift'}
                  </button>
                </div>
                <div className="space-y-2">
                  <KeyValue label="Species" value={data.subject.identity.species} />
                  <KeyValue label="Age" value={data.subject.identity.estimatedAge} />

                  {/* Colors with confidence bars */}
                  <IdentityColorRow
                    label="Eyes"
                    color={data.subject.identity.primaryColor}
                    confidence={data.subject.identity.confidence?.primaryColor}
                    showDrift={showDriftNegatives}
                    driftCategory="eyeColor"
                  />
                  <IdentityColorRow
                    label="Skin"
                    color={data.subject.identity.secondaryColor}
                    confidence={data.subject.identity.confidence?.secondaryColor}
                    showDrift={showDriftNegatives}
                    driftCategory="skinTone"
                  />
                  <IdentityColorRow
                    label="Hair"
                    color={data.subject.identity.accentColor}
                    confidence={data.subject.identity.confidence?.accentColor}
                    showDrift={showDriftNegatives}
                    driftCategory="hairColor"
                  />

                  {/* Face Geometry Section */}
                  {data.subject.identity.faceGeometry && (
                    <FaceGeometryDisplay
                      geometry={data.subject.identity.faceGeometry}
                      confidence={data.subject.identity.confidence?.faceGeometry}
                      showDrift={showDriftNegatives}
                    />
                  )}

                  {/* Hair Specifics Section */}
                  {data.subject.identity.hairSpecifics && (
                    <HairSpecificsDisplay
                      hair={data.subject.identity.hairSpecifics}
                      confidence={data.subject.identity.confidence?.hairSpecifics}
                      showDrift={showDriftNegatives}
                    />
                  )}

                  <KeyValue label="Texture" value={data.subject.identity.texture} />
                  <KeyValue label="Structure" value={data.subject.identity.structure} />

                  {data.subject.identity.distinguishingFeatures.length > 0 && (
                    <TagGroup label="Features" value={data.subject.identity.distinguishingFeatures} />
                  )}

                  {/* Identity Negatives Section (NEW) */}
                  {data.subject.identity.identityNegatives && data.subject.identity.identityNegatives.length > 0 && (
                    <IdentityNegativesDisplay negatives={data.subject.identity.identityNegatives} />
                  )}

                  {data.subject.identity.fixedSeed && (
                    <div className="mt-3 p-2 bg-purple-900/20 border border-purple-800/30 rounded-md">
                      <span className="text-xs text-purple-400 block mb-1">Identity Anchor</span>
                      <span
                        className="text-purple-200 italic cursor-pointer hover:text-purple-100"
                        onClick={() => navigator.clipboard.writeText(data.subject.identity!.fixedSeed)}
                        title="Click to copy"
                      >
                        "{data.subject.identity.fixedSeed}"
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Section>

          <Section title="Scene & Atmosphere" collapsible expanded={isExpanded('scene')} onToggle={() => toggleSection('scene')}>
            <KeyValue label="Setting" value={data.scene.setting} />
            <KeyValue label="Atmosphere" value={data.scene.atmosphere} />
            <div className="mt-2">
              <TagGroup label="Elements" value={data.scene.elements} />
            </div>
          </Section>

        </div>

        {/* COLUMN 2: Technical & Styling */}
        <div className="space-y-6">
          <Section title="Technical Specs" collapsible expanded={isExpanded('technical')} onToggle={() => toggleSection('technical')}>
            <KeyValue label="Shot" value={data.technical.shot} />
            <KeyValue label="Lens" value={data.technical.lens} />
            <KeyValue label="Lighting" value={data.technical.lighting} />
            <KeyValue label="Render" value={data.technical.render} />
          </Section>

          <Section title="Palette & Mood">
            <KeyValue label="Mood" value={data.palette.mood} />
            <ColorPalette value={data.palette.colors} />
          </Section>

          <Section title="Details & Textures" collapsible expanded={isExpanded('details')} onToggle={() => toggleSection('details')}>
             <div className="space-y-3">
                <TagGroup label="Textures" value={data.details.textures} />
                <TagGroup label="Accents" value={data.details.accents} />
             </div>
             {data.text_content?.overlay && data.text_content.overlay !== "None" && (
                 <div className="mt-3 pt-3 border-t border-slate-800">
                     <KeyValue label="Text Overlay" value={data.text_content.overlay} />
                     <KeyValue label="Font Style" value={data.text_content.style} />
                 </div>
             )}
          </Section>

          {/* Style Fusion Section - only show if data exists */}
          {(data.style_fusion?.sources || data.style_fusion?.blend_notes) && (
            <Section title="Style Fusion">
              <KeyValue label="Sources" value={data.style_fusion.sources} />
              <KeyValue label="Blend Notes" value={data.style_fusion.blend_notes} />
            </Section>
          )}

          {data.negative && (
              <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3">
                  <span className="text-xs text-red-400 uppercase tracking-wider block mb-1">Negative Prompt</span>
                  <p className="text-sm text-red-200/80">{data.negative}</p>
              </div>
          )}
        </div>
      </div>

      {/* Raw JSON Toggle or View */}
      <div className="mt-6 pt-4 border-t border-slate-800">
         <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-mono text-slate-500">RAW JSON OUTPUT</p>
            <button
              onClick={handleCopy}
              className={`text-xs flex items-center space-x-1 transition-colors uppercase tracking-wider font-medium ${copied ? 'text-green-400 hover:text-green-300' : 'text-blue-400 hover:text-blue-300'}`}
            >
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                  <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                </svg>
              )}
            </button>
         </div>
         <pre className="bg-slate-950 p-4 rounded-md overflow-x-auto text-xs text-blue-300 font-mono max-h-96">
            {jsonString}
         </pre>
      </div>
    </div>
  );
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

const Section: React.FC<SectionProps> = ({ title, children, collapsible, expanded = true, onToggle, className = '' }) => (
  <div className={`bg-slate-900/50 rounded-lg p-4 border border-slate-800 ${className}`}>
    <div
      className={`flex items-center justify-between ${collapsible ? 'cursor-pointer' : ''}`}
      onClick={collapsible ? onToggle : undefined}
    >
      <h4 className="text-blue-400 font-medium text-sm uppercase tracking-wider">{title}</h4>
      {collapsible && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      )}
    </div>
    {expanded && <div className="space-y-2 mt-3">{children}</div>}
  </div>
);

const KeyValue: React.FC<{ label: string; value: string | null | undefined }> = ({ label, value }) => {
    if (!value || value === "None") return null;
    return (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline text-sm">
            <span className="text-slate-400 mr-2 shrink-0">{label}:</span>
            <span className="text-slate-200 font-medium text-right break-words">{value}</span>
        </div>
    );
};

const TagGroup: React.FC<{ label: string; value: string[] | null | undefined }> = ({ label, value }) => {
    if (!value || value.length === 0) return null;
    return (
        <div>
            <span className="text-xs text-slate-400 block mb-1.5">{label}</span>
            <div className="flex flex-wrap gap-2">
                {value.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-blue-200">
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
};

const ColorPalette: React.FC<{ value: string[] | null | undefined }> = ({ value }) => {
    if (!value || value.length === 0) return null;
    return (
        <div className="mt-3">
            <span className="text-xs text-slate-400 block mb-1.5">Colors</span>
            <div className="flex gap-2">
                {value.map((color, i) => (
                    <ColorSwatch key={i} color={color} />
                ))}
            </div>
        </div>
    );
};

const ColorSwatch: React.FC<{ color: string }> = ({ color }) => {
    return (
        <div
            className="flex flex-col items-center group cursor-pointer"
            title={color}
            onClick={() => navigator.clipboard.writeText(color)}
        >
            <div
                className="w-8 h-8 rounded-full border border-slate-600 shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
            ></div>
            <span className="text-[10px] text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{color}</span>
        </div>
    );
};

const IdentityColorRow: React.FC<{
    label: string;
    color: IdentityColor | undefined;
    confidence?: number;
    showDrift?: boolean;
    driftCategory?: string;
}> = ({ label, color, confidence, showDrift, driftCategory }) => {
    if (!color?.description && !color?.hex) return null;
    const driftNegs = showDrift && driftCategory ? inferNegatives(driftCategory, color.description) : null;
    return (
        <div className="text-sm">
            <div className="flex items-center justify-between">
                <span className="text-slate-400">{label}:</span>
                <div className="flex items-center gap-2">
                    <span className="text-slate-200">{color.description}</span>
                    {color.hex && (
                        <div
                            className="w-5 h-5 rounded-full border border-slate-600 cursor-pointer hover:scale-110 transition-transform"
                            style={{ backgroundColor: color.hex }}
                            title={color.hex}
                            onClick={() => navigator.clipboard.writeText(color.hex)}
                        />
                    )}
                    {confidence !== undefined && (
                        <ConfidenceBar value={confidence} />
                    )}
                </div>
            </div>
            {driftNegs && (
                <div className="text-[10px] text-red-400/70 mt-0.5 text-right">
                    not: {driftNegs.join(', ')}
                </div>
            )}
        </div>
    );
};

// Confidence bar component - visual indicator of extraction reliability
const ConfidenceBar: React.FC<{ value: number; width?: number }> = ({ value, width = 40 }) => {
    const percentage = Math.round(value * 100);
    const getColor = (v: number) => {
        if (v >= 0.8) return 'bg-emerald-500';
        if (v >= 0.6) return 'bg-yellow-500';
        if (v >= 0.4) return 'bg-orange-500';
        return 'bg-red-500';
    };

    return (
        <div
            className="flex items-center gap-1"
            title={`${percentage}% confidence`}
        >
            <div
                className="h-1.5 bg-slate-700 rounded-full overflow-hidden"
                style={{ width: `${width}px` }}
            >
                <div
                    className={`h-full ${getColor(value)} transition-all`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-[10px] text-slate-500 w-7">{percentage}%</span>
        </div>
    );
};

// Face Geometry display component
const FaceGeometryDisplay: React.FC<{
    geometry: FaceGeometry;
    confidence?: number;
    showDrift?: boolean;
}> = ({ geometry, confidence, showDrift }) => {
    const items = [
        { label: 'Face', value: geometry.faceShape, category: 'faceShape' },
        { label: 'Eyes', value: geometry.eyeShape, category: 'eyeShape' },
        { label: 'Brows', value: geometry.browStyle, category: 'browStyle' },
        { label: 'Nose', value: geometry.noseShape, category: 'noseShape' },
        { label: 'Lips', value: geometry.lipShape, category: 'lipShape' },
    ].filter(item => item.value);

    if (items.length === 0) return null;

    return (
        <div className="mt-2 p-2 bg-slate-800/50 border border-slate-700/50 rounded-md">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-violet-400 uppercase tracking-wider">Face Geometry</span>
                {confidence !== undefined && <ConfidenceBar value={confidence} width={32} />}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {items.map(({ label, value, category }) => (
                    <div key={label} className="flex flex-col">
                        <div className="flex justify-between">
                            <span className="text-slate-500">{label}:</span>
                            <span className="text-slate-300 text-right">{value}</span>
                        </div>
                        {showDrift && (
                            <span className="text-[9px] text-red-400/60 text-right">
                                not: {inferNegatives(category, value).join(', ')}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Hair Specifics display component
const HairSpecificsDisplay: React.FC<{
    hair: HairSpecifics;
    confidence?: number;
    showDrift?: boolean;
}> = ({ hair, confidence, showDrift }) => {
    const items = [
        { label: 'Length', value: hair.hairLength, category: 'hairLength' },
        { label: 'Wave', value: hair.hairWave, category: 'hairWave' },
        { label: 'Part', value: hair.hairPart, category: 'hairPart' },
    ].filter(item => item.value);

    if (items.length === 0) return null;

    return (
        <div className="mt-2 p-2 bg-slate-800/50 border border-slate-700/50 rounded-md">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-violet-400 uppercase tracking-wider">Hair Specifics</span>
                {confidence !== undefined && <ConfidenceBar value={confidence} width={32} />}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {items.map(({ label, value, category }) => (
                    <div key={label} className="flex flex-col">
                        <div className="flex justify-between">
                            <span className="text-slate-500">{label}:</span>
                            <span className="text-slate-300 text-right">{value}</span>
                        </div>
                        {showDrift && (
                            <span className="text-[9px] text-red-400/60 text-right">
                                not: {inferNegatives(category, value).join(', ')}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Identity Negatives display component - shows features to avoid
const IdentityNegativesDisplay: React.FC<{
    negatives: string[];
}> = ({ negatives }) => {
    if (!negatives || negatives.length === 0) return null;

    return (
        <div className="mt-2">
            <span className="text-xs text-red-400 block mb-1.5">Identity Negatives (avoid)</span>
            <div className="flex flex-wrap gap-1.5">
                {negatives.map((neg, i) => (
                    <span
                        key={i}
                        className="px-2 py-0.5 bg-red-950/50 border border-red-800/50 rounded text-xs text-red-300"
                    >
                        {neg}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default JsonDisplay;
