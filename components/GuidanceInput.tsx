import React from 'react';

interface GuidanceInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

const GuidanceInput: React.FC<GuidanceInputProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-500 mt-6">
      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/60 shadow-lg">
        <div className="flex items-center space-x-2 mb-3">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-400">
             <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
           </svg>
           <label htmlFor="guidance" className="text-sm font-semibold text-slate-200 tracking-wide">
             Director's Note
           </label>
           <span className="text-xs text-slate-500 uppercase tracking-wider ml-auto">Optional</span>
        </div>
        <textarea
          id="guidance"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Describe how these styles should merge (e.g., 'Use the lighting from image 1 but the texture of image 2')..."
          className="w-full bg-slate-950/80 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none h-24 shadow-inner"
        />
      </div>
    </div>
  );
};

export default GuidanceInput;