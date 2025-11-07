'use client'

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { saveTrack, unsaveTrack, saveAlbum, unsaveAlbum, savePlaylist, unsavePlaylist } from '@/lib/saveService';

interface SaveButtonProps {
  itemId: string;
  itemType: 'track' | 'album' | 'playlist';
  isSaved: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function SaveButton({
  itemId,
  itemType,
  isSaved,
  onToggle,
  size = 'md',
  className = ''
}: SaveButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleToggleSave = async () => {
    if (!user) {
      showToast('Please sign in to save content', 'info');
      return;
    }

    setIsProcessing(true);
    setLocalError(null);

    try {
      let result;

      if (isSaved) {
        // Unsave the item
        switch (itemType) {
          case 'track':
            result = await unsaveTrack(user.id, itemId);
            break;
          case 'album':
            result = await unsaveAlbum(user.id, itemId);
            break;
          case 'playlist':
            result = await unsavePlaylist(user.id, itemId);
            break;
        }

        if (result.data) {
          showToast(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} removed from saved`, 'success');
          onToggle();
        } else {
          throw new Error(result.error || 'Failed to unsave');
        }
      } else {
        // Save the item
        switch (itemType) {
          case 'track':
            result = await saveTrack(user.id, itemId);
            break;
          case 'album':
            result = await saveAlbum(user.id, itemId);
            break;
          case 'playlist':
            result = await savePlaylist(user.id, itemId);
            break;
        }

        if (result.data) {
          showToast(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} saved successfully`, 'success');
          onToggle();
        } else {
          throw new Error(result.error || 'Failed to save');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update save status';
      setLocalError(errorMessage);
      showToast(errorMessage, 'error');
      console.error('Save toggle error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleToggleSave}
        disabled={isProcessing || !user}
        className={`
          flex items-center space-x-2 border rounded-md font-medium transition-all duration-200
          ${sizeClasses[size]}
          ${isSaved 
            ? 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600' 
            : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${!user ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={user ? (isSaved ? `Remove ${itemType}` : `Save ${itemType}`) : 'Sign in to save content'}
        aria-label={isSaved ? `Remove ${itemType} from saved` : `Save ${itemType}`}
      >
        {/* Bookmark Icon */}
        {isProcessing ? (
          <div className={`animate-spin border border-current border-t-transparent rounded-full ${iconSizes[size]}`}></div>
        ) : (
          <svg
            className={iconSizes[size]}
            fill={isSaved ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        )}
        <span>{isSaved ? 'Remove' : 'Save'}</span>
      </button>

      {localError && (
        <div className="absolute z-10 mt-1 text-xs text-red-400 bg-red-900/20 border border-red-700 rounded px-2 py-1 whitespace-nowrap">
          {localError}
        </div>
      )}
    </div>
  );
}
