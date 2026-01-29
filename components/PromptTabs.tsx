import React, { useState, useMemo } from 'react';
import { ImageMetadata, MJCompilerResult } from '../types';

interface PromptTabsProps {
  description: string;
  data: ImageMetadata;
  mjPrompt: MJCompilerResult | null;
}

type TabId = 'description' | 'mj-compiled';

interface TabDef {
  id: TabId;
  label: string;
}

const PromptTabs: React.FC<PromptTabsProps> = ({ description, data, mjPrompt }) => {
  // Default to description tab
  const [activeTab, setActiveTab] = useState<TabId>('description');
  const [copied, setCopied] = useState(false);

  // Build tabs array - Description first, MJ Prompt second (if available)
  const tabs: TabDef[] = useMemo(() => {
    const baseTabs: TabDef[] = [{ id: 'description', label: 'Description' }];
    if (mjPrompt) {
      baseTabs.push({ id: 'mj-compiled', label: 'MJ Prompt' });
    }
    return baseTabs;
  }, [mjPrompt]);

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case 'description':
        return description;
      case 'mj-compiled':
        if (!mjPrompt) return '';
        // Format: positive prompt, then negative as --no parameter
        let content = mjPrompt.positive;
        if (mjPrompt.negative) {
          content += `\n\n--no ${mjPrompt.negative}`;
        }
        return content;
    }
  }, [activeTab, description, mjPrompt]);

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

  // Count segments in MJ prompt for display
  const mjSegmentCount = useMemo(() => {
    if (!mjPrompt) return 0;
    return mjPrompt.positive.split(',').map(s => s.trim()).filter(Boolean).length;
  }, [mjPrompt]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl shadow-black/20 overflow-hidden">
      {/* Tab Bar */}
      <div className="flex border-b border-slate-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? tab.id === 'mj-compiled'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-violet-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
            }`}
          >
            {tab.id === 'mj-compiled' && (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            )}
            {tab.id === 'description' && (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            )}
            {tab.label}
            {tab.id === 'mj-compiled' && mjPrompt && (
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                mjSegmentCount >= 6 && mjSegmentCount <= 8
                  ? 'bg-emerald-800/50 text-emerald-300'
                  : 'bg-amber-800/50 text-amber-300'
              }`}>
                {mjSegmentCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* MJ Prompt Info Banner */}
      {activeTab === 'mj-compiled' && mjPrompt && (
        <div className="px-4 py-3 bg-emerald-900/20 border-b border-emerald-800/50">
          <div className="flex items-center gap-2 text-emerald-400 text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Optimized for Midjourney</span>
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
          <pre className="bg-emerald-950/30 border border-emerald-800/50 rounded-lg p-4 text-sm text-emerald-200 font-mono whitespace-pre-wrap overflow-auto max-h-[40vh]">
            {activeContent || <span className="text-slate-600 italic">MJ compilation unavailable</span>}
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
                  ? activeTab === 'mj-compiled'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
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
