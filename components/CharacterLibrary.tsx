import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SavedCharacterProfile, SubjectIdentity } from '../types';
import {
  loadLibrary,
  saveProfile,
  deleteProfile,
  searchProfiles,
  exportProfiles,
  importProfiles,
  createThumbnail,
} from '../services/characterLibraryService';

interface CharacterLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (identity: SubjectIdentity) => void;
  currentIdentity?: SubjectIdentity;
  currentThumbnailFile?: File;
}

const CharacterLibrary: React.FC<CharacterLibraryProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentIdentity,
  currentThumbnailFile,
}) => {
  const [profiles, setProfiles] = useState<SavedCharacterProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileTags, setNewProfileTags] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profiles on mount and when library changes
  const refreshProfiles = useCallback(() => {
    const results = searchQuery ? searchProfiles(searchQuery) : loadLibrary().profiles;
    setProfiles(results);
  }, [searchQuery]);

  useEffect(() => {
    if (isOpen) {
      refreshProfiles();
    }
  }, [isOpen, refreshProfiles]);

  // Handle save current character
  const handleSave = async () => {
    if (!currentIdentity) return;

    let thumbnail: string | undefined;
    if (currentThumbnailFile) {
      thumbnail = await createThumbnail(currentThumbnailFile);
    }

    const tags = newProfileTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t);

    saveProfile(newProfileName || 'Unnamed Character', currentIdentity, thumbnail, tags);
    setShowSaveDialog(false);
    setNewProfileName('');
    setNewProfileTags('');
    refreshProfiles();
  };

  // Handle delete
  const handleDelete = (id: string) => {
    deleteProfile(id);
    setDeleteConfirmId(null);
    refreshProfiles();
  };

  // Handle export
  const handleExport = () => {
    const json = exportProfiles();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stylefusion-characters-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle import
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const count = importProfiles(e.target?.result as string, false);
        setImportError(null);
        refreshProfiles();
        alert(`Successfully imported ${count} character(s)`);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Import failed');
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle select
  const handleSelect = (profile: SavedCharacterProfile) => {
    onSelect(profile.identity);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-violet-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            Character Library
            <span className="text-sm font-normal text-slate-500">({profiles.length})</span>
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

        {/* Search and Actions Bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-800">
          <div className="flex-1 relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or tag..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          {currentIdentity && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Save Current
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={profiles.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export all characters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg text-sm transition-colors"
            title="Import characters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        {importError && (
          <div className="mx-5 mt-3 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-300">
            {importError}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <p className="text-lg font-medium mb-1">No Characters Saved</p>
              <p className="text-sm">
                {searchQuery
                  ? 'No characters match your search'
                  : 'Extract DNA from an image and save it here'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onSelect={handleSelect}
                  onDelete={() => setDeleteConfirmId(profile.id)}
                  isDeleting={deleteConfirmId === profile.id}
                  onConfirmDelete={() => handleDelete(profile.id)}
                  onCancelDelete={() => setDeleteConfirmId(null)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-600 rounded-xl p-5 w-full max-w-md">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Save Character</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Character Name</label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g., Violet Sorceress"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newProfileTags}
                    onChange={(e) => setNewProfileTags(e.target.value)}
                    placeholder="e.g., fantasy, violet eyes, dark hair"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setNewProfileName('');
                    setNewProfileTags('');
                  }}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Profile Card Component
const ProfileCard: React.FC<{
  profile: SavedCharacterProfile;
  onSelect: (profile: SavedCharacterProfile) => void;
  onDelete: () => void;
  isDeleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}> = ({ profile, onSelect, onDelete, isDeleting, onConfirmDelete, onCancelDelete }) => {
  const colorSwatches = [
    profile.identity.primaryColor.hex,
    profile.identity.secondaryColor.hex,
    profile.identity.accentColor.hex,
  ].filter(Boolean);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors group">
      {/* Thumbnail or Placeholder */}
      <div className="aspect-square bg-slate-900 relative overflow-hidden">
        {profile.thumbnail ? (
          <img
            src={profile.thumbnail}
            alt={profile.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-slate-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        )}

        {/* Color Swatches */}
        {colorSwatches.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {colorSwatches.map((hex, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border border-slate-600 shadow-sm"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        )}

        {/* Delete Confirmation Overlay */}
        {isDeleting && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-3">
            <p className="text-sm text-slate-200 mb-3 text-center">Delete this character?</p>
            <div className="flex gap-2">
              <button
                onClick={onCancelDelete}
                className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmDelete}
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Hover Actions */}
        {!isDeleting && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={() => onSelect(profile)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              Load
            </button>
            <button
              onClick={onDelete}
              className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-slate-200 truncate">{profile.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-500">{profile.identity.species}</span>
          {profile.identity.estimatedAge && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-500">{profile.identity.estimatedAge}</span>
            </>
          )}
        </div>
        {profile.tags && profile.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {profile.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 bg-slate-700/50 rounded text-[10px] text-slate-400"
              >
                {tag}
              </span>
            ))}
            {profile.tags.length > 3 && (
              <span className="text-[10px] text-slate-500">+{profile.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterLibrary;
