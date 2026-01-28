import React, { useRef, useState, useMemo, useEffect } from 'react';
import { MAX_FILES, MAX_FILE_SIZE, ACCEPTED_TYPES } from '../constants';
import { ImageLabel, ImageLabelType, IMAGE_LABEL_OPTIONS } from '../types';

interface FileUploadProps {
  files: File[];
  setFiles: (files: File[]) => void;
  labels: ImageLabel[];
  setLabels: (labels: ImageLabel[]) => void;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ files, setFiles, labels, setLabels, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-clear validation errors after 5 seconds
  useEffect(() => {
    if (validationErrors.length > 0) {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setValidationErrors([]);
      }, 5000);
    }
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [validationErrors]);

  // Check if file is a duplicate
  const isDuplicate = (newFile: File, existingFiles: File[]) => {
    return existingFiles.some(
      f => f.name === newFile.name &&
           f.size === newFile.size &&
           f.lastModified === newFile.lastModified
    );
  };

  // Memoize object URLs to prevent creating new ones on every render
  const previewUrls = useMemo(() => {
    return files.map(file => URL.createObjectURL(file));
  }, [files]);

  // Cleanup object URLs when files change or component unmounts
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const validFiles: File[] = [];
    const newLabels: ImageLabel[] = [];
    const errors: string[] = [];
    const currentCount = files.length;
    let addedCount = 0;

    Array.from(newFiles).forEach(file => {
      // Check max files limit
      if (currentCount + addedCount >= MAX_FILES) {
        errors.push(`"${file.name}" skipped: maximum ${MAX_FILES} images allowed`);
        return;
      }

      // Check file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        const ext = file.name.split('.').pop()?.toUpperCase() || 'Unknown';
        errors.push(`"${file.name}" skipped: ${ext} format not supported (use JPEG, PNG, or WEBP)`);
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const maxMB = MAX_FILE_SIZE / (1024 * 1024);
        errors.push(`"${file.name}" skipped: ${sizeMB}MB exceeds ${maxMB}MB limit`);
        return;
      }

      // Check for duplicates
      if (isDuplicate(file, [...files, ...validFiles])) {
        errors.push(`"${file.name}" skipped: file already added`);
        return;
      }

      validFiles.push(file);
      newLabels.push({ type: 'general' });
      addedCount++;
    });

    if (validFiles.length > 0) {
      setFiles([...files, ...validFiles]);
      setLabels([...labels, ...newLabels]);
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;

    // Check if we're dropping files from outside or reordering
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const removeFile = (index: number) => {
    if (disabled) return;
    setFiles(files.filter((_, i) => i !== index));
    setLabels(labels.filter((_, i) => i !== index));
  };

  const updateLabel = (index: number, type: ImageLabelType) => {
    if (disabled) return;
    const newLabels = [...labels];
    newLabels[index] = { ...newLabels[index], type };
    setLabels(newLabels);
  };

  // Drag-to-reorder handlers
  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleImageDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate indices are within bounds and different
    if (
      draggedIndex === null ||
      draggedIndex < 0 ||
      draggedIndex >= files.length ||
      dropIndex < 0 ||
      dropIndex >= files.length ||
      draggedIndex === dropIndex
    ) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder files and labels
    const newFiles = [...files];
    const newLabels = [...labels];

    const [movedFile] = newFiles.splice(draggedIndex, 1);
    const [movedLabel] = newLabels.splice(draggedIndex, 1);

    newFiles.splice(dropIndex, 0, movedFile);
    newLabels.splice(dropIndex, 0, movedLabel);

    setFiles(newFiles);
    setLabels(newLabels);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="w-full space-y-4">
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 ease-in-out
          ${dragActive ? 'border-blue-400 bg-blue-900/20' : 'border-slate-700 bg-slate-800/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500/50 hover:bg-slate-800'}
        `}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className={`p-4 rounded-full bg-slate-900 shadow-inner ${dragActive ? 'text-blue-400' : 'text-slate-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-slate-200">
              Click to upload or drag & drop
            </p>
            <p className="text-sm text-slate-400">
              Up to {MAX_FILES} images (JPEG, PNG, WEBP)
            </p>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-3 text-sm text-red-200">
          <div className="flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <ul className="space-y-1">
                {validationErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setValidationErrors([])}
              className="flex-shrink-0 p-1 hover:bg-red-800/50 rounded transition-colors"
              aria-label="Dismiss errors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Previews with Labels */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Drag to reorder • Image 1 = highest priority
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className={`group relative rounded-lg overflow-hidden bg-slate-800 border transition-all duration-200
                  ${draggedIndex === idx ? 'opacity-50 scale-95' : ''}
                  ${dragOverIndex === idx ? 'border-blue-400 ring-2 ring-blue-400/50' : 'border-slate-700'}
                  ${!disabled ? 'cursor-grab active:cursor-grabbing' : ''}
                `}
                draggable={!disabled}
                onDragStart={(e) => handleImageDragStart(e, idx)}
                onDragOver={(e) => handleImageDragOver(e, idx)}
                onDragLeave={handleImageDragLeave}
                onDrop={(e) => handleImageDrop(e, idx)}
                onDragEnd={handleImageDragEnd}
              >
                {/* Image Number Badge */}
                <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                  {idx + 1}
                </div>

                {/* Image Preview */}
                <div className="aspect-square">
                  <img
                    src={previewUrls[idx]}
                    alt={`preview ${idx + 1}`}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    draggable={false}
                  />
                </div>

                {/* Remove Button */}
                {!disabled && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/80 text-white rounded-full transition-colors backdrop-blur-sm z-10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                )}

                {/* Label Selector */}
                <div className="p-2 bg-slate-900/95 border-t border-slate-700">
                  <select
                    value={labels[idx]?.type || 'general'}
                    onChange={(e) => updateLabel(idx, e.target.value as ImageLabelType)}
                    disabled={disabled}
                    className="w-full text-xs bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200
                      focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {IMAGE_LABEL_OPTIONS.map(option => (
                      <option key={option.type} value={option.type}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
