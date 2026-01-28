import React, { useState, useMemo } from 'react';
import { ImageMetadata, SDMJIncludeSections, UniversalIncludeSections } from '../types';
import { generateUniversalPrompt, generateSDMJPrompt, getDefaultExportOptions } from '../utils/promptGenerators';

interface PromptTabsProps {
  description: string;
  data: ImageMetadata;
}

type TabId = 'description' | 'sd-mj' | 'universal';

const TABS: { id: TabId; label: string }[] = [
  { id: 'description', label: 'Description' },
  { id: 'sd-mj', label: 'SD / MJ' },
  { id: 'universal', label: 'Universal' },
];

const SDMJ_SECTION_OPTIONS: { key: keyof SDMJIncludeSections; label: string }[] = [
  { key: 'subject', label: 'Subject' },
  { key: 'styleAnchor', label: 'Style' },
  { key: 'colorPalette', label: 'Colors' },
  { key: 'secondaryStyles', label: 'Secondary' },
  { key: 'technical', label: 'Technical' },
  { key: 'negative', label: 'Negative' },
];

const UNIVERSAL_SECTION_OPTIONS: { key: keyof UniversalIncludeSections; label: string }[] = [
  { key: 'meta', label: 'Meta' },
  { key: 'subject', label: 'Subject' },
  { key: 'scene', label: 'Scene' },
  { key: 'technical', label: 'Technical' },
  { key: 'palette', label: 'Palette' },
  { key: 'details', label: 'Details' },
  { key: 'textContent', label: 'Text' },
  { key: 'negative', label: 'Negative' },
];

const PromptTabs: React.FC<PromptTabsProps> = ({ description, data }) => {
  const [activeTab, setActiveTab] = useState<TabId>('description');
  const [copied, setCopied] = useState(false);
  const [sdmjSections, setSdmjSections] = useState<SDMJIncludeSections>(
    () => getDefaultExportOptions('sd-mj').sdmjSections!
  );
  const [universalSections, setUniversalSections] = useState<UniversalIncludeSections>(
    () => getDefaultExportOptions('universal').universalSections!
  );

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case 'description':
        return description;
      case 'sd-mj':
        return generateSDMJPrompt(data, { sdmjSections });
      case 'universal':
        return generateUniversalPrompt(data, { universalSections });
    }
  }, [activeTab, description, data, sdmjSections, universalSections]);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `stylefusion-${activeTab}-${new Date().toISOString().split('T')[0]}.txt`;
    const blob = new Blob([activeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleSdmjSection = (key: keyof SDMJIncludeSections) => {
    setSdmjSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleUniversalSection = (key: keyof UniversalIncludeSections) => {
    setUniversalSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl shadow-black/20 overflow-hidden">
      {/* Tab Bar */}
      <div className="flex border-b border-slate-800">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
            }`}
          >
            {tab.id === 'description' && (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            )}
            {tab.id === 'sd-mj' && (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            )}
            {tab.id === 'universal' && (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section Toggles (SD/MJ and Universal only) */}
      {activeTab !== 'description' && (
        <div className="p-4 border-b border-slate-800">
          <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Include Sections</label>
          <div className="flex flex-wrap gap-2">
            {activeTab === 'sd-mj' ? (
              SDMJ_SECTION_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => toggleSdmjSection(opt.key)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    sdmjSections[opt.key]
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800/50 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  {sdmjSections[opt.key] && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 inline mr-1">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {opt.label}
                </button>
              ))
            ) : (
              UNIVERSAL_SECTION_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => toggleUniversalSection(opt.key)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    universalSections[opt.key]
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800/50 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  {universalSections[opt.key] && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 inline mr-1">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="p-6">
        {activeTab === 'description' ? (
          <div className="relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-600 rounded-full opacity-50"></div>
            <p className="pl-6 text-slate-300 leading-relaxed text-lg italic">
              "{activeContent}"
            </p>
          </div>
        ) : (
          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-blue-200 font-mono whitespace-pre-wrap overflow-auto max-h-[40vh]">
            {activeContent || <span className="text-slate-600 italic">No content (all sections disabled)</span>}
          </pre>
        )}
      </div>

      {/* Footer with character count and actions */}
      <div className="px-6 py-4 border-t border-slate-800 flex justify-between items-center">
        <span className="text-xs text-slate-500">{activeContent.length} characters</span>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={!activeContent}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeContent
                ? 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
          </button>
          <button
            onClick={handleCopy}
            disabled={!activeContent}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              copied
                ? 'bg-green-600 text-white'
                : activeContent
                  ? 'bg-violet-600 hover:bg-violet-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptTabs;
