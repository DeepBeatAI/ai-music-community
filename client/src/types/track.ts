import { Database } from './database';

// Base types from database
export type Track = Database['public']['Tables']['tracks']['Row'];
export type TrackInsert = Database['public']['Tables']['tracks']['Insert'];
export type TrackUpdate = Database['public']['Tables']['tracks']['Update'];

// Extended types with relationships
export interface TrackWithOwner extends Track {
  owner: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export interface TrackWithStats extends Track {
  play_count: number;
  playlist_count: number;
  post_count: number;
}

// Extended types with compression metadata
export interface TrackWithCompression extends Track {
  compression_savings?: number; // Calculated: original_file_size - file_size
}

// Form data interfaces
export interface TrackFormData {
  title: string;
  description?: string;
  genre?: string;
  tags?: string;
  is_public: boolean;
}

// Upload interfaces
export interface TrackUploadData extends TrackFormData {
  file: File;
  compressionResult?: {
    success: boolean;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    duration: number;
    bitrate?: string;
    originalBitrate?: string;
    supabaseUrl?: string; // URL of already-uploaded compressed file
    compressionApplied?: boolean;
  };
}

export interface TrackUploadResult {
  success: boolean;
  track?: Track;
  error?: string;
  errorCode?: TrackUploadError;
  details?: unknown;
  compressionInfo?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    compressionApplied: boolean;
    bitrate?: string;
    originalBitrate?: string;
  };
}

// Error handling
export enum TrackUploadError {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  STORAGE_FAILED = 'STORAGE_FAILED',
  DATABASE_FAILED = 'DATABASE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TRACK_NOT_FOUND = 'TRACK_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

// Error details interface
export interface TrackErrorDetails {
  code: TrackUploadError;
  message: string;
  userMessage: string; // User-friendly message
  technicalDetails?: unknown;
  retryable: boolean;
  suggestedAction?: string;
}

// Track operation result (generic)
export interface TrackOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: TrackErrorDetails;
}

// Error message mappings
export const TRACK_ERROR_MESSAGES: Record<TrackUploadError, {
  userMessage: string;
  technicalMessage: string;
  suggestedAction: string;
  retryable: boolean;
}> = {
  [TrackUploadError.FILE_TOO_LARGE]: {
    userMessage: 'Your audio file is too large. Please upload a file smaller than 50MB.',
    technicalMessage: 'File size exceeds 50MB limit',
    suggestedAction: 'Try compressing your audio file or uploading a shorter track.',
    retryable: false,
  },
  [TrackUploadError.INVALID_FORMAT]: {
    userMessage: 'This file format is not supported. Please upload an MP3, WAV, or FLAC file.',
    technicalMessage: 'Invalid audio format',
    suggestedAction: 'Convert your audio file to MP3, WAV, or FLAC format and try again.',
    retryable: false,
  },
  [TrackUploadError.STORAGE_FAILED]: {
    userMessage: 'We couldn\'t upload your file. Please check your internet connection and try again.',
    technicalMessage: 'Failed to upload file to storage',
    suggestedAction: 'Check your internet connection and try uploading again.',
    retryable: true,
  },
  [TrackUploadError.DATABASE_FAILED]: {
    userMessage: 'We couldn\'t save your track information. Please try again.',
    technicalMessage: 'Failed to create track record in database',
    suggestedAction: 'Try uploading your track again. If the problem persists, contact support.',
    retryable: true,
  },
  [TrackUploadError.NETWORK_ERROR]: {
    userMessage: 'A network error occurred. Please check your connection and try again.',
    technicalMessage: 'Network error during upload',
    suggestedAction: 'Check your internet connection and try again.',
    retryable: true,
  },
  [TrackUploadError.COMPRESSION_FAILED]: {
    userMessage: 'We couldn\'t compress your audio file, but we\'ll upload the original.',
    technicalMessage: 'Audio compression failed',
    suggestedAction: 'Your file will be uploaded without compression. This may take longer.',
    retryable: false,
  },
  [TrackUploadError.UNAUTHORIZED]: {
    userMessage: 'You don\'t have permission to perform this action.',
    technicalMessage: 'Unauthorized access attempt',
    suggestedAction: 'Please sign in and try again.',
    retryable: false,
  },
  [TrackUploadError.TRACK_NOT_FOUND]: {
    userMessage: 'The track you\'re looking for doesn\'t exist or has been deleted.',
    technicalMessage: 'Track not found',
    suggestedAction: 'The track may have been deleted. Try refreshing the page.',
    retryable: false,
  },
  [TrackUploadError.VALIDATION_ERROR]: {
    userMessage: 'Some information is missing or invalid. Please check your input.',
    technicalMessage: 'Validation error',
    suggestedAction: 'Make sure all required fields are filled out correctly.',
    retryable: false,
  },
};
