import React, { useState, useRef, useCallback } from 'react';
import { SubjectIdentity } from '../types';

interface ComparisonViewProps {
  sourceImage: string;  // URL or base64 of source image
  generatedImage: string;  // base64 of generated image
  generatedMimeType: string;
  identity?: SubjectIdentity;
  onClose: () => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({
  sourceImage,
  generatedImage,
  generatedMimeType,
  identity,
  onClose,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('side-by-side');
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate overall confidence score from identity
  const overallConfidence = identity?.confidence?.overall ?? null;

  // Handle slider drag
  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, [isDragging]);

  // Handle touch events for mobile
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  // Download comparison as single image
  const handleDownloadComparison = useCallback(async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load both images
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    try {
      const [srcImg, genImg] = await Promise.all([
        loadImage(sourceImage),
        loadImage(`data:${generatedMimeType};base64,${generatedImage}`),
      ]);

      // Create side-by-side canvas
      const width = srcImg.width + genImg.width + 20; // 20px gap
      const height = Math.max(srcImg.height, genImg.height);

      canvas.width = width;
      canvas.height = height;

      // Dark background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);

      // Draw source
      ctx.drawImage(srcImg, 0, (height - srcImg.height) / 2);

      // Draw generated
      ctx.drawImage(genImg, srcImg.width + 20, (height - genImg.height) / 2);

      // Add labels
      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      ctx.fillText('SOURCE', 10, 20);
      ctx.fillText('GENERATED', srcImg.width + 30, 20);

      // Download
      const link = document.createElement('a');
      link.download = 'comparison.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error creating comparison image:', error);
    }
  }, [sourceImage, generatedImage, generatedMimeType]);

  // Get confidence color
  const getConfidenceColor = (value: number) => {
    if (value >= 0.8) return 'text-emerald-400';
    if (value >= 0.6) return 'text-yellow-400';
    if (value >= 0.4) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-100">Comparison View</h2>
          {overallConfidence !== null && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Identity Match:</span>
              <span className={`text-lg font-semibold ${getConfidenceColor(overallConfidence)}`}>
                {Math.round(overallConfidence * 100)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setViewMode('slider')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === 'slider'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Slider
            </button>
          </div>

          <button
            onClick={handleDownloadComparison}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
          </button>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        {viewMode === 'side-by-side' ? (
          <SideBySideView
            sourceImage={sourceImage}
            generatedImage={generatedImage}
            generatedMimeType={generatedMimeType}
          />
        ) : (
          <SliderView
            sourceImage={sourceImage}
            generatedImage={generatedImage}
            generatedMimeType={generatedMimeType}
            sliderPosition={sliderPosition}
            containerRef={containerRef}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
          />
        )}
      </div>

      {/* Footer with identity details */}
      {identity && (
        <div className="px-5 py-3 border-t border-slate-700 bg-slate-900/80">
          <div className="flex items-center justify-center gap-6 text-sm">
            {identity.confidence && (
              <>
                <ConfidenceItem label="Eyes" value={identity.confidence.primaryColor} />
                <ConfidenceItem label="Skin" value={identity.confidence.secondaryColor} />
                <ConfidenceItem label="Hair" value={identity.confidence.accentColor} />
                {identity.confidence.faceGeometry > 0 && (
                  <ConfidenceItem label="Face" value={identity.confidence.faceGeometry} />
                )}
                {identity.confidence.hairSpecifics > 0 && (
                  <ConfidenceItem label="Hair Style" value={identity.confidence.hairSpecifics} />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Side-by-Side View Component
const SideBySideView: React.FC<{
  sourceImage: string;
  generatedImage: string;
  generatedMimeType: string;
}> = ({ sourceImage, generatedImage, generatedMimeType }) => (
  <div className="flex gap-6 max-w-6xl w-full h-full">
    <div className="flex-1 flex flex-col items-center">
      <span className="text-xs text-slate-400 uppercase tracking-wider mb-2">Source</span>
      <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg bg-slate-900">
        <img
          src={sourceImage}
          alt="Source"
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
    <div className="flex-1 flex flex-col items-center">
      <span className="text-xs text-slate-400 uppercase tracking-wider mb-2">Generated</span>
      <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg bg-slate-900">
        <img
          src={`data:${generatedMimeType};base64,${generatedImage}`}
          alt="Generated"
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
  </div>
);

// Slider View Component
const SliderView: React.FC<{
  sourceImage: string;
  generatedImage: string;
  generatedMimeType: string;
  sliderPosition: number;
  containerRef: React.RefObject<HTMLDivElement>;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
}> = ({
  sourceImage,
  generatedImage,
  generatedMimeType,
  sliderPosition,
  containerRef,
  onMouseDown,
  onMouseUp,
  onMouseMove,
  onTouchMove,
}) => (
  <div
    ref={containerRef}
    className="relative max-w-3xl w-full aspect-square cursor-ew-resize select-none rounded-lg overflow-hidden"
    onMouseMove={onMouseMove}
    onMouseUp={onMouseUp}
    onMouseLeave={onMouseUp}
    onTouchMove={onTouchMove}
  >
    {/* Generated (back layer) */}
    <img
      src={`data:${generatedMimeType};base64,${generatedImage}`}
      alt="Generated"
      className="absolute inset-0 w-full h-full object-contain bg-slate-900"
      draggable={false}
    />

    {/* Source (front layer, clipped) */}
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ width: `${sliderPosition}%` }}
    >
      <img
        src={sourceImage}
        alt="Source"
        className="w-full h-full object-contain bg-slate-900"
        style={{ width: `${100 / (sliderPosition / 100)}%` }}
        draggable={false}
      />
    </div>

    {/* Slider line */}
    <div
      className="absolute top-0 bottom-0 w-1 bg-white/80 cursor-ew-resize"
      style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
    >
      {/* Handle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-800">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      </div>
    </div>

    {/* Labels */}
    <span className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded text-xs text-white">
      SOURCE
    </span>
    <span className="absolute top-3 right-3 px-2 py-1 bg-black/60 rounded text-xs text-white">
      GENERATED
    </span>
  </div>
);

// Confidence Item Component
const ConfidenceItem: React.FC<{
  label: string;
  value: number;
}> = ({ label, value }) => {
  const percentage = Math.round(value * 100);

  const getBarColor = (v: number) => {
    if (v >= 0.8) return 'bg-emerald-500';
    if (v >= 0.6) return 'bg-yellow-500';
    if (v >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400">{label}:</span>
      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor(value)} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-slate-300 w-8">{percentage}%</span>
    </div>
  );
};

export default ComparisonView;
