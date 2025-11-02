'use client';

import { useState, useCallback } from 'react';
import AudioUpload from '@/components/AudioUpload';
import PostUploadAssignment from '@/components/library/PostUploadAssignment';
import { useAuth } from '@/contexts/AuthContext';

interface UploadedTrack {
  id: string;
  title: string;
  description?: string | null;
  file_url: string;
  duration?: number | null;
}

interface TrackUploadSectionProps {
  onUploadSuccess?: (track: UploadedTrack) => void;
}

export default function TrackUploadSection({ onUploadSuccess }: TrackUploadSectionProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploadedTrack, setUploadedTrack] = useState<UploadedTrack | null>(null);
  const [showAssignment, setShowAssignment] = useState(false);

  // Handle track upload success
  const handleTrackUploaded = useCallback((trackId: string, track: UploadedTrack) => {
    console.log('Track uploaded successfully:', trackId, track);
    setUploadedTrack(track);
    setShowAssignment(true);
    
    // Notify parent component
    if (onUploadSuccess) {
      onUploadSuccess(track);
    }
  }, [onUploadSuccess]);

  // Handle assignment completion (Done button)
  const handleAssignmentDone = useCallback(() => {
    setShowAssignment(false);
    setUploadedTrack(null);
    setIsExpanded(false); // Collapse section
  }, []);

  // Handle upload another (Upload Another button)
  const handleUploadAnother = useCallback(() => {
    setShowAssignment(false);
    setUploadedTrack(null);
    // Keep section expanded
  }, []);

  // Handle skip assignment
  const handleSkipAssignment = useCallback(() => {
    setShowAssignment(false);
    setUploadedTrack(null);
    setIsExpanded(false); // Collapse section
  }, []);

  // Toggle expand/collapse
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      {/* Section Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🎵</span>
          <div>
            <h2 className="text-xl font-bold text-gray-200">Upload New Track</h2>
            <p className="text-sm text-gray-400">Add music to your library</p>
          </div>
        </div>
        
        <button
          onClick={toggleExpanded}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
        >
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Collapsed State - Show Upload Button */}
      {!isExpanded && (
        <div className="p-4">
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Upload New Track</span>
          </button>
        </div>
      )}

      {/* Expanded State - Show Upload Component */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Audio Upload Component */}
          {!showAssignment && (
            <AudioUpload
              onFileSelect={() => {}} // Legacy callback - not used in track mode
              onFileRemove={() => {}}
              onTrackUploaded={handleTrackUploaded}
              uploadMode="track"
              enableCompression={true}
              compressionQuality="medium"
            />
          )}

          {/* Post-Upload Assignment */}
          {showAssignment && uploadedTrack && user && (
            <PostUploadAssignment
              trackId={uploadedTrack.id}
              userId={user.id}
              onDone={handleAssignmentDone}
              onUploadAnother={handleUploadAnother}
              onSkip={handleSkipAssignment}
            />
          )}
        </div>
      )}
    </div>
  );
}
