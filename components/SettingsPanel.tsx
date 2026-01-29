import React, { useState, useEffect } from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  textModelId: string;
  imageModelId: string;
  onApiKeyChange: (key: string) => void;
  onTextModelIdChange: (modelId: string) => void;
  onImageModelIdChange: (modelId: string) => void;
  onTestConnection: (keyOverride?: string) => Promise<boolean>;
  connectionStatus: 'idle' | 'success' | 'error';
  connectionError: string | null;
  isConnecting: boolean;
  validateApiKey: (key: string) => { valid: boolean; error?: string };
  textModels: { id: string; label: string }[];
  imageModels: { id: string; label: string }[];
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  apiKey,
  textModelId,
  imageModelId,
  onApiKeyChange,
  onTextModelIdChange,
  onImageModelIdChange,
  onTestConnection,
  connectionStatus,
  connectionError,
  isConnecting,
  validateApiKey,
  textModels,
  imageModels,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(apiKey);
  const [localTextModelId, setLocalTextModelId] = useState(textModelId);
  const [localImageModelId, setLocalImageModelId] = useState(imageModelId);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync local state when props change
  useEffect(() => {
    setLocalKey(apiKey);
    setLocalTextModelId(textModelId);
    setLocalImageModelId(imageModelId);
  }, [apiKey, textModelId, imageModelId]);

  if (!isOpen) return null;

  const handleKeyChange = (value: string) => {
    setLocalKey(value);
    if (value.trim()) {
      const validation = validateApiKey(value);
      setValidationError(validation.valid ? null : validation.error || null);
    } else {
      setValidationError(null);
    }
  };

  const handleSave = () => {
    onApiKeyChange(localKey);
    onTextModelIdChange(localTextModelId);
    onImageModelIdChange(localImageModelId);
  };

  const handleTestConnection = async () => {
    // Save first, then test with the local key directly to avoid stale state
    onApiKeyChange(localKey);
    onTextModelIdChange(localTextModelId);
    onImageModelIdChange(localImageModelId);
    await onTestConnection(localKey);
  };

  const isKeyValid = !validationError && localKey.trim() !== '';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
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
          {/* API Key Section */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={localKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="AIza..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showKey ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            {validationError && (
              <p className="mt-1 text-xs text-red-400">{validationError}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Get your API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          {/* Text Analysis Model Section */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Text Analysis Model
              <span className="text-slate-500 font-normal ml-2">(for metadata extraction)</span>
            </label>
            <select
              value={localTextModelId}
              onChange={(e) => setLocalTextModelId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {textModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* Image Generation Model Section */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Image Generation Model
              <span className="text-slate-500 font-normal ml-2">(for Imagen calls)</span>
            </label>
            <select
              value={localImageModelId}
              onChange={(e) => setLocalImageModelId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {imageModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* Test Connection Button */}
          <div>
            <button
              onClick={handleTestConnection}
              disabled={isConnecting || !localKey.trim() || !!validationError}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing Connection...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                  </svg>
                  Test Connection
                </>
              )}
            </button>

            {/* Connection Status */}
            {connectionStatus === 'success' && (
              <div className="mt-2 p-2 bg-green-900/20 border border-green-800/50 rounded text-green-400 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Connection successful!
              </div>
            )}
            {connectionStatus === 'error' && connectionError && (
              <div className="mt-2 p-2 bg-red-900/20 border border-red-800/50 rounded text-red-400 text-sm">
                {connectionError}
              </div>
            )}
          </div>

          {/* Referrer Warning Note */}
          <div className="p-3 bg-amber-900/20 border border-amber-800/30 rounded-lg">
            <div className="flex gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm text-amber-300 font-medium">Referrer Restrictions</p>
                <p className="text-xs text-amber-400/80 mt-1">
                  Some API keys have referrer restrictions. If you encounter CORS errors,
                  ensure your API key allows requests from this domain or has no
                  referrer restrictions in Google Cloud Console.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-4 border-t border-slate-700 bg-slate-800/50 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { handleSave(); onClose(); }}
            disabled={!isKeyValid}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
