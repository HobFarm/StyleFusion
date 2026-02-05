import React, { useState, useRef } from 'react';
import { generateFluxImage, FluxModel } from '../services/fluxService';
import { FLUX_MODELS, FLUX_DEFAULT_MODEL } from '../constants';

interface FluxImageGeneratorProps {
  mjPrompt: string;
  universalPrompt: string;
  referenceFiles: File[];
  disabled?: boolean;
}

/**
 * Convert blob to data URL for display
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

const FluxImageGenerator: React.FC<FluxImageGeneratorProps> = ({
  mjPrompt,
  universalPrompt,
  referenceFiles,
  disabled = false
}) => {
  const [selectedModel, setSelectedModel] = useState<FluxModel>(FLUX_DEFAULT_MODEL);
  const [includeReferences, setIncludeReferences] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use universal prompt by default (FLUX handles natural language well)
  // Fall back to MJ prompt if universal is empty
  const effectivePrompt = universalPrompt || mjPrompt;

  const handleGenerate = async () => {
    if (!effectivePrompt) {
      setError('No prompt available. Please generate analysis first.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGeneratedImage(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await generateFluxImage({
        prompt: effectivePrompt,
        model: selectedModel,
        referenceImages: referenceFiles,
        includeReferences,
        abortSignal: controller.signal
      });

      // Convert blob to data URL for display
      const dataUrl = await blobToDataUrl(result.imageBlob);
      setGeneratedImage(dataUrl);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Generation cancelled.');
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `flux-${selectedModel}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <section className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-inner ring-1 ring-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">FLUX.2 Generation</h3>
            <p className="text-xs text-slate-500">Cloudflare Workers AI</p>
          </div>
        </div>

        {generatedImage && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg font-medium shadow-lg shadow-orange-900/20 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
          </button>
        )}
      </div>

      {/* Model Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as FluxModel)}
          disabled={isGenerating || disabled}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {FLUX_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label} - {model.description}
            </option>
          ))}
        </select>
      </div>

      {/* Reference Images Toggle */}
      {referenceFiles.length > 0 && (
        <div className="mb-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeReferences}
              onChange={(e) => setIncludeReferences(e.target.checked)}
              disabled={isGenerating || disabled}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 disabled:opacity-50"
            />
            <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
              Include reference images ({referenceFiles.length} available)
            </span>
          </label>
          {includeReferences && (
            <p className="mt-1.5 text-xs text-slate-500 ml-7">
              Images will be resized to fit 512x512 and used as style/subject references
            </p>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Generate Button */}
      {!generatedImage && !isGenerating && (
        <button
          onClick={handleGenerate}
          disabled={disabled || !effectivePrompt}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white shadow-lg transition-all duration-300 transform active:scale-95 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 hover:shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          Generate with FLUX.2
        </button>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2 px-8 py-3 rounded-lg bg-slate-800 text-white">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Generating with FLUX.2...</span>
          </div>
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        </div>
      )}

      {/* Generated Image Display */}
      {generatedImage && (
        <div className="mt-4">
          <img
            src={generatedImage}
            alt="Generated with FLUX.2"
            className="max-w-full rounded-lg border border-slate-700 shadow-lg"
          />
          <button
            onClick={handleGenerate}
            disabled={disabled}
            className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-medium text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Regenerate
          </button>
        </div>
      )}
    </section>
  );
};

export default FluxImageGenerator;
