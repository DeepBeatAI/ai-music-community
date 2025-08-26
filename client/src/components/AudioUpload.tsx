'use client'
import { useState, useRef, useCallback } from 'react';
import { validateAudioFile, formatFileSize, formatDuration, AudioValidationResult } from '@/utils/audio';

interface AudioUploadProps {
  onFileSelect: (file: File, duration?: number) => void;
  onFileRemove: () => void;
  disabled?: boolean;
  maxFileSize?: number;
}

export default function AudioUpload({ 
  onFileSelect, 
  onFileRemove, 
  disabled = false,
  maxFileSize = 50 * 1024 * 1024 
}: AudioUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<AudioValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);
    setIsValidating(true);
    setValidation(null);

    try {
      const validationResult = await validateAudioFile(file);
      setValidation(validationResult);

      if (validationResult.isValid && validationResult.file) {
        onFileSelect(validationResult.file, validationResult.duration);
      }
    } catch (error) {
      console.error('File validation error:', error);
      setValidation({
        isValid: false,
        errors: ['Failed to validate file. Please try again.']
      });
    } finally {
      setIsValidating(false);
    }
  }, [onFileSelect]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    handleFiles(e.target.files);
  }, [disabled, handleFiles]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setValidation(null);
    onFileRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileRemove]);

  const openFileDialog = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${dragActive ? 'border-blue-400 bg-blue-50/5' : 'border-gray-600 hover:border-gray-500'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${selectedFile ? 'border-green-500 bg-green-50/5' : ''}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        {isValidating ? (
          <div className="space-y-2">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400">Validating audio file...</p>
          </div>
        ) : selectedFile ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2 text-green-400">
              <span className="text-2xl">🎵</span>
              <span className="font-medium">Audio file selected</span>
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-gray-400">
                {formatFileSize(selectedFile.size)}
                {validation?.duration && ` • ${formatDuration(validation.duration)}`}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
              className="px-3 py-1 text-sm text-red-400 hover:text-red-300 border border-red-400 hover:border-red-300 rounded transition-colors"
            >
              Remove File
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-4xl text-gray-500">🎵</div>
            <div className="space-y-1">
              <p className="text-lg font-medium text-gray-300">
                Drop your audio file here, or click to browse
              </p>
              <p className="text-sm text-gray-400">
                Supports MP3, WAV, FLAC, M4A, OGG • Max {formatFileSize(maxFileSize)} • Max 10 minutes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validation && !validation.isValid && (
        <div className="bg-red-900/20 border border-red-700 rounded p-3">
          <p className="text-red-400 text-sm font-medium mb-1">File validation failed:</p>
          <ul className="text-red-400 text-sm space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}