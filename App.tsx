import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import FileUpload from './components/FileUpload';
import JsonDisplay from './components/JsonDisplay';
import PromptTabs from './components/PromptTabs';
import GuidanceInput from './components/GuidanceInput';
import ImageGenerator from './components/ImageGenerator';
import FluxImageGenerator from './components/FluxImageGenerator';
import DNAEditor from './components/DNAEditor';
import CharacterLibrary from './components/CharacterLibrary';
import ComparisonView from './components/ComparisonView';
import SettingsPanel from './components/SettingsPanel';
import UserSettings from './components/UserSettings';
import { analyzeImages } from './services/geminiService';
import { downloadLogs, clearLogs, getLogCount } from './services/loggingService';
import { formatAllAsText, formatAllAsJson } from './utils/textFormatters';
import { GeneratedData, ProcessingState, ImageLabel, SubjectIdentity, ImageMetadata } from './types';
import { MAX_FILES } from './constants';
import { useGeminiClient } from './hooks/useGeminiClient';
import hobfarmLogo from './assets/hobfarm-logo-white.png';
import hobfarmSmall from './assets/hobfarm-small-white.png';
import { getVersionString } from './utils/version';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [labels, setLabels] = useState<ImageLabel[]>([]);
  const [guidance, setGuidance] = useState<string>("");
  const [results, setResults] = useState<GeneratedData | null>(null);
  const [status, setStatus] = useState<ProcessingState>({
    isProcessing: false,
    step: 'idle',
    error: null
  });
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [logCount, setLogCount] = useState(getLogCount());
  const [showBetaBanner, setShowBetaBanner] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const {
    apiKey,
    textModelId,
    imageModelId,
    isConfigured,
    isConnecting,
    connectionStatus,
    connectionError,
    textModels,
    imageModels,
    setApiKey,
    setTextModelId,
    setImageModelId,
    testConnection,
    clearConfig,
    validateApiKey,
  } = useGeminiClient();

  // DNA Editor state
  const [showDNAEditor, setShowDNAEditor] = useState(false);

  // Character Library state
  const [showCharacterLibrary, setShowCharacterLibrary] = useState(false);

  // Comparison View state
  const [showComparisonView, setShowComparisonView] = useState(false);
  const [generatedImageData, setGeneratedImageData] = useState<{ base64: string; mimeType: string } | null>(null);

  // Get the source image URL for comparison (first file that's a subject reference)
  const sourceImageUrl = useMemo(() => {
    const subjectIndex = labels.findIndex(l => l.type === 'subject');
    const sourceFile = subjectIndex >= 0 ? files[subjectIndex] : files[0];
    return sourceFile ? URL.createObjectURL(sourceFile) : null;
  }, [files, labels]);

  // Get the current identity from results
  const currentIdentity = results?.jsonResult?.subject?.identity;

  // Get the first file for thumbnail generation
  const thumbnailFile = files[0];

  const handleClear = useCallback(() => {
    setFiles([]);
    setLabels([]);
    setGuidance("");
    setResults(null);
    setStatus({ isProcessing: false, step: 'idle', error: null });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (status.isProcessing) {
          handleCancel();
        } else {
          handleClear();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClear, status.isProcessing]);

  const handleGenerate = async () => {
    if (files.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus({ isProcessing: true, step: 'compressing', error: null, retryInfo: undefined });
    setResults(null);

    try {
      await new Promise(r => setTimeout(r, 100));

      setStatus({ isProcessing: true, step: 'analyzing', error: null });

      const { json, description, mjPrompt } = await analyzeImages(
        files, labels, guidance, controller.signal,
        (info) => {
          if (info.attempt && info.maxAttempts) {
            setStatus(prev => ({
              ...prev,
              retryInfo: { attempt: info.attempt!, maxAttempts: info.maxAttempts! }
            }));
          }
        },
        apiKey,
        textModelId
      );

      setResults({
        jsonResult: json,
        descriptionResult: description,
        mjCompilerResult: mjPrompt
      });

      setStatus({ isProcessing: false, step: 'complete', error: null, retryInfo: undefined });
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus({
          isProcessing: false,
          step: 'idle',
          error: 'Generation cancelled.',
          retryInfo: undefined
        });
      } else {
        setStatus({
          isProcessing: false,
          step: 'error',
          error: err instanceof Error ? err.message : "An unexpected error occurred.",
          retryInfo: undefined
        });
      }
    } finally {
      abortControllerRef.current = null;
      setLogCount(getLogCount());
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleClearClick = () => {
    handleClear();
  };

  const handleDownloadLogs = () => {
    downloadLogs();
    setLogCount(getLogCount());
  };

  const handleClearLogs = () => {
    clearLogs();
    setLogCount(getLogCount());
  };

  // Handle DNA changes from editor
  const handleDNAChange = useCallback((newIdentity: SubjectIdentity) => {
    if (!results?.jsonResult) return;

    const updatedResults: GeneratedData = {
      ...results,
      jsonResult: {
        ...results.jsonResult,
        subject: {
          ...results.jsonResult.subject,
          identity: newIdentity,
        },
      },
    };
    setResults(updatedResults);
  }, [results]);

  // Handle identity selection from library
  const handleIdentitySelect = useCallback((identity: SubjectIdentity) => {
    if (!results?.jsonResult) return;

    const updatedResults: GeneratedData = {
      ...results,
      jsonResult: {
        ...results.jsonResult,
        subject: {
          ...results.jsonResult.subject,
          identity,
        },
      },
    };
    setResults(updatedResults);
  }, [results]);

  // Handle image generation callback (for comparison view)
  const handleImageGenerated = useCallback((base64: string, mimeType: string) => {
    setGeneratedImageData({ base64, mimeType });
  }, []);

  const handleDownloadAll = (format: 'txt' | 'json') => {
    if (!results?.jsonResult) return;

    const content = format === 'json'
      ? formatAllAsJson(results.descriptionResult, results.jsonResult, results.mjCompilerResult)
      : formatAllAsText(results.descriptionResult, results.jsonResult, results.mjCompilerResult);

    const mimeType = format === 'json' ? 'application/json' : 'text/plain';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    a.download = `stylefusion-export-${timestamp}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto space-y-12">

        {/* Beta Banner */}
        {showBetaBanner && (
          <div className="bg-amber-600/90 text-white text-sm py-2 px-4 flex items-center justify-center gap-2 rounded-lg">
            <span>StyleFusion is currently in beta. <a href="mailto:stylefusion@hob.farm" className="underline hover:text-amber-200">Share feedback</a></span>
            <button
              onClick={() => setShowBetaBanner(false)}
              className="ml-2 text-white/80 hover:text-white text-lg leading-none"
              aria-label="Dismiss banner"
            >
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <header className="space-y-4 text-center">
          <div className="relative inline-flex items-center justify-center gap-2">
            <span className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              StyleFusion
            </span>
            <span className="text-xl md:text-2xl text-slate-400">by</span>
            <a href="https://hob.farm" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <img
                src={hobfarmLogo}
                alt="HobFarm"
                className="h-7 md:h-8"
              />
            </a>
            {/* Header icons */}
            <div className="absolute -right-20 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {/* Quick Settings gear icon */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
                title="Quick Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {/* Account Settings user icon */}
              <button
                onClick={() => setShowUserSettings(true)}
                className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
                title="Account Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-slate-400 max-w-lg mx-auto">
            Upload up to <span className="text-blue-400 font-bold">{MAX_FILES}</span> images.
            Gemini will fuse their styles into a cohesive visual description and structured metadata.
          </p>
        </header>

        {/* Main Interface */}
        <main className="space-y-8">

          {!isConfigured ? (
            /* API Key Required State */
            <section className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800/60 shadow-xl backdrop-blur-sm text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-900/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-amber-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">
                API Key Required
              </h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Configure your Gemini API key in Settings to start analyzing images.
              </p>
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Open Settings
              </button>
            </section>
          ) : (
          <>
          {/* Upload Section */}
          <section className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/60 shadow-xl backdrop-blur-sm">
            <FileUpload
              files={files}
              setFiles={setFiles}
              labels={labels}
              setLabels={setLabels}
              disabled={status.isProcessing}
            />

            {files.length > 0 && (
              <GuidanceInput
                value={guidance}
                onChange={setGuidance}
                disabled={status.isProcessing}
              />
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-end items-center">
              {status.error && (
                <span className="text-red-400 text-sm bg-red-900/20 px-3 py-1 rounded-full border border-red-900/50">
                  {status.error}
                </span>
              )}

              {files.length > 0 && (
                <div className="flex gap-3 w-full sm:w-auto">
                  {status.isProcessing ? (
                    <>
                      <button
                        onClick={handleCancel}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
                        title="Cancel (Esc)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Cancel</span>
                      </button>
                      <div className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg bg-slate-700 text-white">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>
                        {status.step === 'compressing'
                          ? 'Processing Images...'
                          : status.retryInfo && status.retryInfo.attempt > 1
                            ? `Analyzing Styles... (Retry ${status.retryInfo.attempt - 1}/${status.retryInfo.maxAttempts - 1})`
                            : 'Analyzing Styles...'}
                      </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleClearClick}
                        className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Clear (Esc)"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleGenerate}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg font-medium text-white shadow-lg shadow-blue-900/20 transition-all duration-300 transform active:scale-95 bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20"
                      >
                        <span>Generate Analysis</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Results Section */}
          {results && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">

              {/* Export & Download Buttons */}
              {results.jsonResult && (
                <div className="flex justify-between items-center gap-3">
                  {/* Left side: Character DNA actions */}
                  <div className="flex gap-2">
                    {currentIdentity && (
                      <>
                        <button
                          onClick={() => setShowDNAEditor(true)}
                          className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-600/50 rounded-lg text-sm transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                          </svg>
                          Edit DNA
                        </button>
                        {generatedImageData && sourceImageUrl && (
                          <button
                            onClick={() => setShowComparisonView(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-600/50 rounded-lg text-sm transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                            Compare
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => setShowCharacterLibrary(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-600/50 rounded-lg text-sm transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                      Character Library
                    </button>
                  </div>

                  {/* Right side: Download All Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium shadow-lg shadow-emerald-900/20 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download All
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`}>
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {showDownloadMenu && (
                      <div className="absolute right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden min-w-[160px]">
                        <button
                          onClick={() => handleDownloadAll('txt')}
                          className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
                            <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                          </svg>
                          Text (.txt)
                        </button>
                        <button
                          onClick={() => handleDownloadAll('json')}
                          className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
                            <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zM10 8a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 0110 8z" clipRule="evenodd" />
                          </svg>
                          JSON (.json)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Prompt Tabs (MJ Prompt, Description, SD/MJ, Universal) */}
              {results.descriptionResult && results.jsonResult && (
                <PromptTabs
                  description={results.descriptionResult}
                  data={results.jsonResult}
                  mjPrompt={results.mjCompilerResult}
                />
              )}

              {/* Structured JSON Data */}
              {results.jsonResult && (
                 <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl shadow-black/20">
                   <JsonDisplay data={results.jsonResult} />
                 </div>
              )}

              {/* Image Generation */}
              {results.jsonResult && (
                <ImageGenerator
                  metadata={results.jsonResult}
                  disabled={status.isProcessing}
                  onImageGenerated={handleImageGenerated}
                  apiKey={apiKey}
                  imageModel={imageModelId}
                />
              )}

              {/* FLUX.2 Image Generation (Cloudflare Workers AI) */}
              {results.jsonResult && results.descriptionResult && (
                <FluxImageGenerator
                  mjPrompt={results.mjCompilerResult?.positive || ''}
                  universalPrompt={results.descriptionResult}
                  referenceFiles={files}
                  disabled={status.isProcessing}
                />
              )}
            </div>
          )}
          </>
          )}
        </main>

        {/* DNA Editor Modal */}
        {showDNAEditor && currentIdentity && (
          <DNAEditor
            identity={currentIdentity}
            onChange={handleDNAChange}
            onClose={() => setShowDNAEditor(false)}
            onSaveToLibrary={() => {
              setShowDNAEditor(false);
              setShowCharacterLibrary(true);
            }}
          />
        )}

        {/* Character Library Modal */}
        {showCharacterLibrary && (
          <CharacterLibrary
            isOpen={showCharacterLibrary}
            onClose={() => setShowCharacterLibrary(false)}
            onSelect={handleIdentitySelect}
            currentIdentity={currentIdentity}
            currentThumbnailFile={thumbnailFile}
          />
        )}

        {/* Comparison View Modal */}
        {showComparisonView && generatedImageData && sourceImageUrl && (
          <ComparisonView
            sourceImage={sourceImageUrl}
            generatedImage={generatedImageData.base64}
            generatedMimeType={generatedImageData.mimeType}
            identity={currentIdentity}
            onClose={() => setShowComparisonView(false)}
          />
        )}

        {/* Settings Panel Modal */}
        {showSettings && (
          <SettingsPanel
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            apiKey={apiKey}
            textModelId={textModelId}
            imageModelId={imageModelId}
            onApiKeyChange={setApiKey}
            onTextModelIdChange={setTextModelId}
            onImageModelIdChange={setImageModelId}
            onTestConnection={testConnection}
            connectionStatus={connectionStatus}
            connectionError={connectionError}
            isConnecting={isConnecting}
            validateApiKey={validateApiKey}
            textModels={textModels}
            imageModels={imageModels}
          />
        )}

        {/* User Settings Modal */}
        {showUserSettings && (
          <UserSettings
            isOpen={showUserSettings}
            onClose={() => setShowUserSettings(false)}
            apiKey={apiKey}
            textModelId={textModelId}
            imageModelId={imageModelId}
            textModels={textModels}
            imageModels={imageModels}
            connectionStatus={connectionStatus}
            connectionError={connectionError}
            isConnecting={isConnecting}
            onApiKeyChange={setApiKey}
            onTextModelIdChange={setTextModelId}
            onImageModelIdChange={setImageModelId}
            onTestConnection={testConnection}
            clearConfig={clearConfig}
          />
        )}

        <footer className="text-center text-slate-600 text-sm py-4 space-y-4">
          {/* Branding */}
          <div className="space-y-2">
            <a href="https://hob.farm" target="_blank" rel="noopener noreferrer" className="inline-block hover:opacity-80 transition-opacity">
              <img
                src={hobfarmSmall}
                alt="HobFarm"
                className="h-10 mx-auto"
              />
            </a>
            <p className="text-slate-500 text-xs">
              StyleFusion by HobFarm &ndash; &copy; Hob.Farm
            </p>
          </div>

          {/* Version info */}
          <p className="text-slate-600 text-xs font-mono">
            {getVersionString()}
          </p>

          {/* Log buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleDownloadLogs}
              className="text-blue-400 hover:text-blue-300 text-xs underline"
            >
              Download Logs ({logCount} entries)
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={handleClearLogs}
              className="text-red-400 hover:text-red-300 text-xs underline"
            >
              Clear Logs
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
