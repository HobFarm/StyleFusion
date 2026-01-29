import React, { useState, useEffect } from 'react';
import { getCFUserEmail, signOut, clearAllAppData } from '../utils/cloudflareAuth';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  // From useGeminiClient
  apiKey: string;
  textModelId: string;
  imageModelId: string;
  textModels: { id: string; label: string }[];
  imageModels: { id: string; label: string }[];
  connectionStatus: 'idle' | 'success' | 'error';
  connectionError: string | null;
  isConnecting: boolean;
  // Callbacks
  onApiKeyChange: (key: string) => void;
  onTextModelIdChange: (modelId: string) => void;
  onImageModelIdChange: (modelId: string) => void;
  onTestConnection: (keyOverride?: string) => Promise<boolean>;
  clearConfig: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({
  isOpen,
  onClose,
  apiKey,
  textModelId,
  imageModelId,
  textModels,
  imageModels,
  connectionStatus,
  connectionError,
  isConnecting,
  onApiKeyChange,
  onTextModelIdChange,
  onImageModelIdChange,
  onTestConnection,
  clearConfig,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Get user email on mount
  useEffect(() => {
    setUserEmail(getCFUserEmail());
  }, []);

  if (!isOpen) return null;

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 4)}${'●'.repeat(Math.min(apiKey.length - 8, 20))}${apiKey.slice(-4)}`
    : '';

  const handleTestConnection = async () => {
    await onTestConnection(apiKey);
  };

  const handleRemoveKey = () => {
    clearConfig();
  };

  const handleDeleteAllData = () => {
    clearAllAppData();
    signOut();
  };

  const handleTextModelChange = (modelId: string) => {
    onTextModelIdChange(modelId);
  };

  const handleImageModelChange = (modelId: string) => {
    onImageModelIdChange(modelId);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            Account Settings
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Account Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Account</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Signed in as</p>
                  <p className="text-slate-100 font-medium">
                    {userEmail || 'Not signed in'}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </section>

          {/* API Configuration Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">API Configuration</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
              {/* API Key Display */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Gemini API Key</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={showKey ? apiKey : maskedKey}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-300 font-mono"
                    />
                    {apiKey && (
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
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
                    )}
                  </div>
                </div>
                {!apiKey && (
                  <p className="mt-2 text-sm text-amber-400">No API key configured. Use the quick settings to add one.</p>
                )}
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {connectionStatus === 'success' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-900/30 border border-green-800/50 rounded-full text-xs text-green-400">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                      Connected
                    </span>
                  ) : connectionStatus === 'error' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-900/30 border border-red-800/50 rounded-full text-xs text-red-400">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                      Error
                    </span>
                  ) : apiKey ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 border border-slate-600/50 rounded-full text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                      Not tested
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {apiKey && (
                    <>
                      <button
                        onClick={handleTestConnection}
                        disabled={isConnecting}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md text-sm transition-colors"
                      >
                        {isConnecting ? (
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                          </svg>
                        )}
                        Test
                      </button>
                      <button
                        onClick={handleRemoveKey}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-sm transition-colors"
                      >
                        Remove Key
                      </button>
                    </>
                  )}
                </div>
              </div>
              {connectionError && (
                <p className="text-sm text-red-400 mt-2">{connectionError}</p>
              )}
            </div>
          </section>

          {/* Model Preferences Section */}
          <section>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Model Preferences</h3>
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
              {/* Text Analysis Model */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Text Analysis Model
                  <span className="text-slate-500 font-normal ml-2">(for metadata extraction)</span>
                </label>
                <select
                  value={textModelId}
                  onChange={(e) => handleTextModelChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {textModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image Generation Model */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Image Generation Model
                  <span className="text-slate-500 font-normal ml-2">(for Imagen calls)</span>
                </label>
                <select
                  value={imageModelId}
                  onChange={(e) => handleImageModelChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {imageModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Danger Zone Section */}
          <section>
            <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4">Danger Zone</h3>
            <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-slate-200 font-medium">Delete All My Data</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Permanently delete all your saved data, including API keys, character library, and preferences. You will be signed out.
                  </p>
                </div>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete All Data
                  </button>
                ) : (
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAllData}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Confirm Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
