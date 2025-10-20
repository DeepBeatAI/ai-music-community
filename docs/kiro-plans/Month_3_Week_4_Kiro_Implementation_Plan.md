# AI Music Community Platform - Month 3 Week 4 Implementation Plan

## Implementation Overview

**Objective:** Implement playlist system and unified performance monitoring dashboard

**Approach:** Priority-based task execution with dependency management

**Key Requirements:**
- Follow all steering documents in `.kiro/steering/`
- Use specs functionality to plan each major task before implementation
- Check for TypeScript/linting errors after every code change
- Pause for user testing at designated checkpoints
- Never perform git operations
- Request confirmation before major functionality/UI changes

---

## Steering Documents Reference

Before beginning implementation, review these critical documents:

### Required Reading:
- `.kiro/steering/product.md` - Product vision and requirements
- `.kiro/steering/tech.md` - Technology stack and architecture decisions
- `.kiro/steering/structure.md` - Project file structure and organization

### Development Guidelines:
- Follow established TypeScript patterns
- Use existing component structure and naming conventions
- Implement comprehensive error handling
- Add proper TypeScript types for all new code
- Follow Next.js 14 and Supabase best practices

---

## Task Execution Order

Tasks are ordered by dependency. Complete each task fully before proceeding to the next.

### Foundation Phase
1. TASK-1: Database Schema for Playlists
2. TASK-2: TypeScript Types and Interfaces
3. TASK-3: Playlist Utility Functions

### Feature Implementation Phase
4. TASK-4: Playlist Creation UI
5. TASK-5: Playlist Display and Management
6. TASK-6: Track Management in Playlists
7. TASK-7: Playlist Integration

### Monitoring Phase
8. TASK-8: Unified Performance Dashboard Structure
9. TASK-9: Performance Monitoring Features

### Finalization Phase
10. TASK-10: Integration Testing
11. TASK-11: Documentation and Final Validation

---

## TASK-1: Database Schema for Playlists

### Dependencies
- None (foundation task)

### Objective
Create database schema for playlists system with proper relationships and security policies

### Implementation Steps

#### Step 1: Review Existing Database Structure
```
ACTION: Execute SQL query to review current database schema
CHECK: Understand existing tables (users, posts, tracks, etc.)
VERIFY: Identify user_id pattern and naming conventions
```

#### Step 2: Create Playlists Table Migration
```sql
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS playlists_user_id_idx ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS playlists_created_at_idx ON public.playlists(created_at DESC);
```

#### Step 3: Create Playlist Tracks Junction Table
```sql
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(playlist_id, track_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS playlist_tracks_playlist_id_idx ON public.playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS playlist_tracks_track_id_idx ON public.playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS playlist_tracks_position_idx ON public.playlist_tracks(playlist_id, position);
```

#### Step 4: Implement Row Level Security Policies
```sql
-- Enable RLS
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Playlists policies
CREATE POLICY "Users can view their own playlists"
  ON public.playlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public playlists"
  ON public.playlists FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create playlists"
  ON public.playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
  ON public.playlists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
  ON public.playlists FOR DELETE
  USING (auth.uid() = user_id);

-- Playlist tracks policies
CREATE POLICY "Users can view tracks in their playlists"
  ON public.playlist_tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_tracks.playlist_id
      AND (playlists.user_id = auth.uid() OR playlists.is_public = true)
    )
  );

CREATE POLICY "Users can add tracks to their playlists"
  ON public.playlist_tracks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_tracks.playlist_id
      AND playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove tracks from their playlists"
  ON public.playlist_tracks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_tracks.playlist_id
      AND playlists.user_id = auth.uid()
    )
  );
```

#### Step 5: Create Database Functions for Playlist Operations
```sql
-- Function to update playlist updated_at timestamp
CREATE OR REPLACE FUNCTION update_playlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_updated_at();

-- Function to get playlist track count
CREATE OR REPLACE FUNCTION get_playlist_track_count(playlist_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.playlist_tracks
  WHERE playlist_id = playlist_uuid;
$$ LANGUAGE sql STABLE;
```

### Validation Criteria
```
VERIFY: Playlists table exists with correct schema
VERIFY: Playlist_tracks table exists with correct schema
VERIFY: All RLS policies are active
VERIFY: Indexes are created for performance
VERIFY: Database functions are working correctly
```

### Testing Checkpoint
```
PAUSE FOR USER: Please verify database schema in Supabase dashboard
- Check playlists table structure
- Check playlist_tracks table structure  
- Verify RLS policies are enabled
- Test creating a sample playlist record (manually in Supabase)
```

---

## TASK-2: TypeScript Types and Interfaces

### Dependencies
- TASK-1 (requires database schema)

### Objective
Create TypeScript types and interfaces for playlist system with proper type safety

### Implementation Steps

#### Step 1: Generate Supabase Types
```
ACTION: Run supabase gen types typescript command
FILE: Update src/types/supabase.ts with generated types
VERIFY: New Playlist and PlaylistTrack types are present
```

#### Step 2: Create Playlist Types File
```typescript
// FILE: src/types/playlist.ts

import { Database } from './supabase';

// Base types from database
export type Playlist = Database['public']['Tables']['playlists']['Row'];
export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert'];
export type PlaylistUpdate = Database['public']['Tables']['playlists']['Update'];

export type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row'];
export type PlaylistTrackInsert = Database['public']['Tables']['playlist_tracks']['Insert'];

// Extended types with relationships
export interface PlaylistWithTracks extends Playlist {
  tracks: Array<{
    id: string;
    track_id: string;
    position: number;
    added_at: string;
    track: {
      id: string;
      title: string;
      artist_name: string;
      audio_url: string;
      duration?: number;
      cover_image_url?: string;
    };
  }>;
  track_count: number;
}

export interface PlaylistWithOwner extends Playlist {
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
}

export interface PlaylistFormData {
  name: string;
  description?: string;
  is_public: boolean;
  cover_image_url?: string;
}

export interface AddTrackToPlaylistParams {
  playlist_id: string;
  track_id: string;
  position?: number;
}

export interface RemoveTrackFromPlaylistParams {
  playlist_id: string;
  track_id: string;
}

export interface UpdatePlaylistPositionsParams {
  playlist_id: string;
  track_positions: Array<{
    track_id: string;
    position: number;
  }>;
}

// Response types
export interface CreatePlaylistResponse {
  success: boolean;
  playlist?: Playlist;
  error?: string;
}

export interface PlaylistOperationResponse {
  success: boolean;
  error?: string;
}
```

#### Step 3: Update Existing Types (if needed)
```
ACTION: Review src/types/index.ts
UPDATE: Export new playlist types
VERIFY: No type conflicts with existing types
```

### Validation Criteria
```
VERIFY: All playlist types are properly exported
VERIFY: Types match database schema exactly
VERIFY: No TypeScript errors in types file
VERIFY: Relationship types are correctly defined
```

### Testing Checkpoint
```
ACTION: Run TypeScript compiler check
COMMAND: npx tsc --noEmit
VERIFY: No type errors
```

---

## TASK-3: Playlist Utility Functions

### Dependencies
- TASK-1 (database schema)
- TASK-2 (TypeScript types)

### Objective
Create reusable utility functions for playlist operations

### Implementation Steps

#### Step 1: Create Playlist API Utilities
```typescript
// FILE: src/lib/playlists.ts

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type {
  Playlist,
  PlaylistWithTracks,
  PlaylistFormData,
  CreatePlaylistResponse,
  PlaylistOperationResponse,
  AddTrackToPlaylistParams,
  RemoveTrackFromPlaylistParams
} from '@/types/playlist';
import type { Database } from '@/types/supabase';

const supabase = createClientComponentClient<Database>();

/**
 * Create a new playlist
 */
export async function createPlaylist(
  userId: string,
  data: PlaylistFormData
): Promise<CreatePlaylistResponse> {
  try {
    const { data: playlist, error } = await supabase
      .from('playlists')
      .insert({
        user_id: userId,
        name: data.name,
        description: data.description || null,
        is_public: data.is_public,
        cover_image_url: data.cover_image_url || null,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, playlist };
  } catch (error) {
    console.error('Error creating playlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create playlist'
    };
  }
}

/**
 * Get user's playlists
 */
export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  try {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user playlists:', error);
    return [];
  }
}

/**
 * Get playlist with tracks
 */
export async function getPlaylistWithTracks(
  playlistId: string
): Promise<PlaylistWithTracks | null> {
  try {
    const { data, error } = await supabase
      .from('playlists')
      .select(`
        *,
        tracks:playlist_tracks(
          id,
          track_id,
          position,
          added_at,
          track:tracks(
            id,
            title,
            artist_name,
            audio_url,
            duration,
            cover_image_url
          )
        )
      `)
      .eq('id', playlistId)
      .single();

    if (error) throw error;

    if (!data) return null;

    // Sort tracks by position
    const sortedTracks = (data.tracks || []).sort((a, b) => a.position - b.position);

    return {
      ...data,
      tracks: sortedTracks,
      track_count: sortedTracks.length
    };
  } catch (error) {
    console.error('Error fetching playlist with tracks:', error);
    return null;
  }
}

/**
 * Update playlist
 */
export async function updatePlaylist(
  playlistId: string,
  updates: Partial<PlaylistFormData>
): Promise<PlaylistOperationResponse> {
  try {
    const { error } = await supabase
      .from('playlists')
      .update(updates)
      .eq('id', playlistId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating playlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update playlist'
    };
  }
}

/**
 * Delete playlist
 */
export async function deletePlaylist(
  playlistId: string
): Promise<PlaylistOperationResponse> {
  try {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete playlist'
    };
  }
}

/**
 * Add track to playlist
 */
export async function addTrackToPlaylist(
  params: AddTrackToPlaylistParams
): Promise<PlaylistOperationResponse> {
  try {
    // Get current max position
    const { data: tracks } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', params.playlist_id)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = params.position ?? ((tracks?.[0]?.position ?? -1) + 1);

    const { error } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: params.playlist_id,
        track_id: params.track_id,
        position: nextPosition
      });

    if (error) {
      // Handle duplicate entry
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Track already in playlist'
        };
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding track to playlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add track'
    };
  }
}

/**
 * Remove track from playlist
 */
export async function removeTrackFromPlaylist(
  params: RemoveTrackFromPlaylistParams
): Promise<PlaylistOperationResponse> {
  try {
    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', params.playlist_id)
      .eq('track_id', params.track_id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error removing track from playlist:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove track'
    };
  }
}

/**
 * Check if track is in playlist
 */
export async function isTrackInPlaylist(
  playlistId: string,
  trackId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('playlist_tracks')
      .select('id')
      .eq('playlist_id', playlistId)
      .eq('track_id', trackId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return !!data;
  } catch (error) {
    console.error('Error checking track in playlist:', error);
    return false;
  }
}
```

### Validation Criteria
```
VERIFY: All functions are properly typed
VERIFY: Error handling is comprehensive
VERIFY: Functions follow existing patterns in codebase
VERIFY: No TypeScript errors in utility file
```

### Testing Checkpoint
```
ACTION: Run TypeScript compiler check
COMMAND: npx tsc --noEmit
VERIFY: No type errors
VERIFY: All imports resolve correctly
```

---

## TASK-4: Playlist Creation UI

### Dependencies
- TASK-1 (database schema)
- TASK-2 (types)
- TASK-3 (utility functions)

### Objective
Create user interface for creating new playlists

### Implementation Steps

#### Step 1: Create CreatePlaylist Component
```typescript
// FILE: src/components/playlists/CreatePlaylist.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createPlaylist } from '@/lib/playlists';
import type { PlaylistFormData } from '@/types/playlist';

interface CreatePlaylistProps {
  onSuccess?: (playlistId: string) => void;
  onCancel?: () => void;
}

export default function CreatePlaylist({ onSuccess, onCancel }: CreatePlaylistProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlaylistFormData>({
    name: '',
    description: '',
    is_public: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to create a playlist');
      return;
    }

    if (!formData.name.trim()) {
      setError('Playlist name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await createPlaylist(user.id, formData);

    if (result.success && result.playlist) {
      if (onSuccess) {
        onSuccess(result.playlist.id);
      } else {
        router.push(`/playlists/${result.playlist.id}`);
      }
    } else {
      setError(result.error || 'Failed to create playlist');
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
      <h2 className="text-2xl font-bold mb-4">Create New Playlist</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Playlist Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            maxLength={255}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="My Awesome Playlist"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your playlist..."
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_public"
            name="is_public"
            checked={formData.is_public}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700">
            Make this playlist public
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Playlist'}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

#### Step 2: Create Modal Wrapper for Playlist Creation
```typescript
// FILE: src/components/playlists/CreatePlaylistModal.tsx

'use client';

import { useState } from 'react';
import CreatePlaylist from './CreatePlaylist';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (playlistId: string) => void;
}

export default function CreatePlaylistModal({
  isOpen,
  onClose,
  onSuccess
}: CreatePlaylistModalProps) {
  if (!isOpen) return null;

  const handleSuccess = (playlistId: string) => {
    if (onSuccess) {
      onSuccess(playlistId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <CreatePlaylist
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
```

### Validation Criteria
```
VERIFY: Component renders correctly
VERIFY: Form validation works
VERIFY: Error messages display properly
VERIFY: Loading states are handled
VERIFY: TypeScript types are correct
```

### Testing Checkpoint
```
PAUSE FOR USER: Please test playlist creation
1. Open the create playlist form
2. Try creating a playlist without a name (should show error)
3. Create a public playlist
4. Create a private playlist
5. Verify playlists appear in database
6. Check that user is redirected/modal closes after creation
```

---

## TASK-5: Playlist Display and Management

### Dependencies
- TASK-4 (creation UI)

### Objective
Create components for displaying and managing playlists

### Implementation Steps

#### Step 1: Create PlaylistCard Component
```typescript
// FILE: src/components/playlists/PlaylistCard.tsx

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { deletePlaylist } from '@/lib/playlists';
import type { Playlist } from '@/types/playlist';

interface PlaylistCardProps {
  playlist: Playlist;
  onDelete?: () => void;
  isOwner: boolean;
}

export default function PlaylistCard({ playlist, onDelete, isOwner }: PlaylistCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!isOwner) return;

    setIsDeleting(true);
    const result = await deletePlaylist(playlist.id);

    if (result.success) {
      onDelete?.();
    } else {
      alert(result.error || 'Failed to delete playlist');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <Link href={`/playlists/${playlist.id}`}>
        <div className="mb-3">
          {playlist.cover_image_url ? (
            <img
              src={playlist.cover_image_url}
              alt={playlist.name}
              className="w-full h-48 object-cover rounded-md"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
              <svg className="w-16 h-16 text-white opacity-50" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <Link href={`/playlists/${playlist.id}`} className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600 transition-colors">
              {playlist.name}
            </h3>
          </Link>
          
          {!playlist.is_public && (
            <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
              Private
            </span>
          )}
        </div>

        {playlist.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {playlist.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{new Date(playlist.created_at).toLocaleDateString()}</span>
          
          {isOwner && (
            <div className="flex gap-2">
              <Link
                href={`/playlists/${playlist.id}/edit`}
                className="text-blue-600 hover:text-blue-800"
              >
                Edit
              </Link>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Playlist?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{playlist.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 border border-gray-300 py-2 px-4 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Step 2: Create PlaylistsList Component
```typescript
// FILE: src/components/playlists/PlaylistsList.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPlaylists } from '@/lib/playlists';
import PlaylistCard from './PlaylistCard';
import CreatePlaylistModal from './CreatePlaylistModal';
import type { Playlist } from '@/types/playlist';

export default function PlaylistsList() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, [user]);

  const loadPlaylists = async () => {
    if (!user) {
      setPlaylists([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const data = await getUserPlaylists(user.id);
    setPlaylists(data);
    setIsLoading(false);
  };

  const handlePlaylistDeleted = () => {
    loadPlaylists();
  };

  const handlePlaylistCreated = () => {
    loadPlaylists();
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in to view your playlists.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading playlists...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">My Playlists</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Create Playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="mt-4 text-gray-600">You haven't created any playlists yet.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            Create your first playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {playlists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onDelete={handlePlaylistDeleted}
              isOwner={true}
            />
          ))}
        </div>
      )}

      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handlePlaylistCreated}
      />
    </div>
  );
}
```

### Validation Criteria
```
VERIFY: Playlists display correctly in grid
VERIFY: Create button works
VERIFY: Delete functionality works with confirmation
VERIFY: Loading states display properly
VERIFY: Empty state shows when no playlists
```

### Testing Checkpoint
```
PAUSE FOR USER: Please test playlist display
1. View your playlists list
2. Click create button and create a playlist
3. Verify new playlist appears in list
4. Try deleting a playlist (test cancel and confirm)
5. Check responsive design on mobile
```

---

## TASK-6: Track Management in Playlists

### Dependencies
- TASK-5 (playlist display)

### Objective
Enable adding and removing tracks from playlists

### Implementation Steps

#### Step 1: Create AddToPlaylist Component
```typescript
// FILE: src/components/playlists/AddToPlaylist.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserPlaylists,
  addTrackToPlaylist,
  isTrackInPlaylist
} from '@/lib/playlists';
import type { Playlist } from '@/types/playlist';

interface AddToPlaylistProps {
  trackId: string;
  onSuccess?: () => void;
}

export default function AddToPlaylist({ trackId, onSuccess }: AddToPlaylistProps) {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [trackInPlaylists, setTrackInPlaylists] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && user) {
      loadPlaylists();
    }
  }, [isOpen, user]);

  const loadPlaylists = async () => {
    if (!user) return;

    setIsLoading(true);
    const data = await getUserPlaylists(user.id);
    setPlaylists(data);

    // Check which playlists already contain this track
    const checks = await Promise.all(
      data.map(p => isTrackInPlaylist(p.id, trackId))
    );
    
    const inPlaylists = new Set<string>();
    data.forEach((playlist, index) => {
      if (checks[index]) {
        inPlaylists.add(playlist.id);
      }
    });
    
    setTrackInPlaylists(inPlaylists);
    setIsLoading(false);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    setAddingTo(playlistId);

    const result = await addTrackToPlaylist({
      playlist_id: playlistId,
      track_id: trackId
    });

    if (result.success) {
      setTrackInPlaylists(prev => new Set([...prev, playlistId]));
      onSuccess?.();
    } else {
      alert(result.error || 'Failed to add track to playlist');
    }

    setAddingTo(null);
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add to Playlist
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold mb-3">Add to playlist</h3>

              {isLoading ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : playlists.length === 0 ? (
                <p className="text-sm text-gray-600 py-4">
                  You don't have any playlists yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {playlists.map((playlist) => {
                    const isInPlaylist = trackInPlaylists.has(playlist.id);
                    const isAdding = addingTo === playlist.id;

                    return (
                      <button
                        key={playlist.id}
                        onClick={() => !isInPlaylist && handleAddToPlaylist(playlist.id)}
                        disabled={isInPlaylist || isAdding}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                          isInPlaylist
                            ? 'bg-green-50 text-green-700 cursor-default'
                            : 'hover:bg-gray-100'
                        } disabled:opacity-50`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">
                            {playlist.name}
                          </span>
                          {isInPlaylist && (
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {isAdding && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

#### Step 2: Create PlaylistDetail Page
```typescript
// FILE: src/app/playlists/[id]/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPlaylistWithTracks } from '@/lib/playlists';
import PlaylistDetailClient from '@/components/playlists/PlaylistDetailClient';

export default async function PlaylistPage({
  params
}: {
  params: { id: string }
}) {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const playlist = await getPlaylistWithTracks(params.id);

  if (!playlist) {
    redirect('/playlists');
  }

  // Check access permissions
  if (!playlist.is_public && playlist.user_id !== session?.user?.id) {
    redirect('/playlists');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PlaylistDetailClient
        playlist={playlist}
        isOwner={playlist.user_id === session?.user?.id}
      />
    </div>
  );
}
```

#### Step 3: Create PlaylistDetailClient Component
```typescript
// FILE: src/components/playlists/PlaylistDetailClient.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { removeTrackFromPlaylist } from '@/lib/playlists';
import type { PlaylistWithTracks } from '@/types/playlist';

interface PlaylistDetailClientProps {
  playlist: PlaylistWithTracks;
  isOwner: boolean;
}

export default function PlaylistDetailClient({
  playlist: initialPlaylist,
  isOwner
}: PlaylistDetailClientProps) {
  const router = useRouter();
  const [playlist, setPlaylist] = useState(initialPlaylist);
  const [removingTrack, setRemovingTrack] = useState<string | null>(null);

  const handleRemoveTrack = async (trackId: string) => {
    if (!isOwner) return;

    const confirmed = confirm('Remove this track from the playlist?');
    if (!confirmed) return;

    setRemovingTrack(trackId);

    const result = await removeTrackFromPlaylist({
      playlist_id: playlist.id,
      track_id: trackId
    });

    if (result.success) {
      // Update local state
      setPlaylist(prev => ({
        ...prev,
        tracks: prev.tracks.filter(t => t.track_id !== trackId),
        track_count: prev.track_count - 1
      }));
    } else {
      alert(result.error || 'Failed to remove track');
    }

    setRemovingTrack(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-6">
          {playlist.cover_image_url ? (
            <img
              src={playlist.cover_image_url}
              alt={playlist.name}
              className="w-48 h-48 object-cover rounded-lg shadow-lg"
            />
          ) : (
            <div className="w-48 h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center">
              <svg className="w-20 h-20 text-white opacity-50" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">{playlist.name}</h1>
              {!playlist.is_public && (
                <span className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full">
                  Private
                </span>
              )}
            </div>

            {playlist.description && (
              <p className="text-gray-600 mb-4">{playlist.description}</p>
            )}

            <div className="text-sm text-gray-500">
              {playlist.track_count} {playlist.track_count === 1 ? 'track' : 'tracks'}
              {' • '}
              Created {new Date(playlist.created_at).toLocaleDateString()}
            </div>

            {isOwner && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => router.push(`/playlists/${playlist.id}/edit`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Edit Playlist
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="bg-white rounded-lg shadow-md">
        {playlist.tracks.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="mt-4 text-gray-600">No tracks in this playlist yet.</p>
            {isOwner && (
              <p className="mt-2 text-sm text-gray-500">
                Browse tracks and add them to your playlist
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {playlist.tracks.map((item, index) => (
              <div
                key={item.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 font-medium w-8">
                    {index + 1}
                  </span>

                  {item.track.cover_image_url ? (
                    <img
                      src={item.track.cover_image_url}
                      alt={item.track.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item.track.title}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {item.track.artist_name}
                    </p>
                  </div>

                  {item.track.duration && (
                    <span className="text-sm text-gray-500">
                      {Math.floor(item.track.duration / 60)}:
                      {String(Math.floor(item.track.duration % 60)).padStart(2, '0')}
                    </span>
                  )}

                  {isOwner && (
                    <button
                      onClick={() => handleRemoveTrack(item.track_id)}
                      disabled={removingTrack === item.track_id}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Remove from playlist"
                    >
                      {removingTrack === item.track_id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Validation Criteria
```
VERIFY: AddToPlaylist dropdown works
VERIFY: Tracks can be added to playlists
VERIFY: Duplicate tracks are prevented
VERIFY: Tracks can be removed from playlists
VERIFY: Playlist detail page displays correctly
```

### Testing Checkpoint
```
PAUSE FOR USER: Please test track management
1. Navigate to a track
2. Click "Add to Playlist"
3. Add track to a playlist
4. Verify track appears in playlist
5. Try adding same track again (should show as already added)
6. Go to playlist detail page
7. Remove a track from playlist
8. Verify track count updates
```

---

## TASK-7: Playlist Integration

### Dependencies
- TASK-6 (track management)

### Objective
Integrate playlist functionality throughout the application

### Implementation Steps

#### Step 1: Add Playlists Link to Navigation
```
ACTION: Update main navigation component
FILE: src/components/Header.tsx or src/components/Navigation.tsx
ADD: Link to /playlists page
VERIFY: Link appears in navigation when user is authenticated
```

#### Step 2: Add AddToPlaylist to Track Components
```
ACTION: Find track display components
POSSIBLE FILES:
- src/components/tracks/TrackCard.tsx
- src/components/tracks/TrackList.tsx
- src/app/tracks/[id]/page.tsx
ADD: <AddToPlaylist trackId={track.id} />
VERIFY: Button appears on track displays
```

#### Step 3: Create Playlists Main Page
```typescript
// FILE: src/app/playlists/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PlaylistsList from '@/components/playlists/PlaylistsList';

export default async function PlaylistsPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PlaylistsList />
    </div>
  );
}
```

### Validation Criteria
```
VERIFY: Navigation link works
VERIFY: Playlists page renders
VERIFY: AddToPlaylist appears on tracks
VERIFY: Full user flow works end-to-end
```

### Testing Checkpoint
```
PAUSE FOR USER: Please test full playlist integration
1. Click Playlists link in navigation
2. Create a new playlist
3. Browse to a track
4. Add track to playlist
5. Go back to playlists
6. Open the playlist
7. Verify track is there
8. Remove the track
9. Test both public and private playlists
```

---

## TASK-8: Unified Performance Dashboard Structure

### Dependencies
- None (independent feature)

### Objective
Create unified performance monitoring dashboard consolidating scattered monitoring components

### Implementation Steps

#### Step 1: Review Existing Performance Components
```
ACTION: Search for existing performance monitoring code
LOOK FOR:
- Performance metrics components
- Cache monitoring
- Bandwidth tracking
- Any scattered monitoring interfaces
DOCUMENT: Current state of performance monitoring
```

#### Step 2: Create Dashboard Layout Component
```typescript
// FILE: src/components/performance/PerformanceDashboard.tsx

'use client';

import { useState, useEffect } from 'react';

type Tab = 'overview' | 'performance' | 'cache' | 'bandwidth';

export default function PerformanceDashboard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Toggle dashboard
  const toggleDashboard = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={toggleDashboard}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Open Performance Dashboard"
      >
        📊 Performance
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-2xl z-50 max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Performance Dashboard</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={toggleDashboard}
            className="text-gray-500 hover:text-gray-700"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {[
          { id: 'overview' as Tab, label: 'Overview' },
          { id: 'performance' as Tab, label: 'Performance' },
          { id: 'cache' as Tab, label: 'Cache' },
          { id: 'bandwidth' as Tab, label: 'Bandwidth' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && <OverviewTab autoRefresh={autoRefresh} />}
        {activeTab === 'performance' && <PerformanceTab autoRefresh={autoRefresh} />}
        {activeTab === 'cache' && <CacheTab autoRefresh={autoRefresh} />}
        {activeTab === 'bandwidth' && <BandwidthTab autoRefresh={autoRefresh} />}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 p-3 bg-gray-50 flex gap-2">
        <button
          onClick={() => {
            console.log('Performance report generated');
            alert('Performance report logged to console');
          }}
          className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Generate Report
        </button>
        <button
          onClick={() => {
            if (confirm('Reset all performance metrics?')) {
              // Reset logic will be implemented in individual tabs
              window.location.reload();
            }
          }}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// Placeholder tab components (will be implemented in next step)
function OverviewTab({ autoRefresh }: { autoRefresh: boolean }) {
  return <div className="text-gray-600">Overview tab content</div>;
}

function PerformanceTab({ autoRefresh }: { autoRefresh: boolean }) {
  return <div className="text-gray-600">Performance tab content</div>;
}

function CacheTab({ autoRefresh }: { autoRefresh: boolean }) {
  return <div className="text-gray-600">Cache tab content</div>;
}

function BandwidthTab({ autoRefresh }: { autoRefresh: boolean }) {
  return <div className="text-gray-600">Bandwidth tab content</div>;
}
```

### Validation Criteria
```
VERIFY: Dashboard button appears in bottom-right
VERIFY: Dashboard expands/collapses correctly
VERIFY: All tabs are clickable
VERIFY: Tab switching works smoothly
VERIFY: Auto-refresh toggle works
```

### Testing Checkpoint
```
PAUSE FOR USER: Please test dashboard structure
1. Look for performance button in bottom-right corner
2. Click to expand dashboard
3. Try switching between tabs
4. Toggle auto-refresh on/off
5. Click Generate Report (should show alert)
6. Test close button
```

---

## TASK-9: Performance Monitoring Features

### Dependencies
- TASK-8 (dashboard structure)

### Objective
Implement performance monitoring features in each dashboard tab

### Implementation Steps

#### Step 1: Implement Overview Tab
```typescript
// Update OverviewTab in src/components/performance/PerformanceDashboard.tsx

function OverviewTab({ autoRefresh }: { autoRefresh: boolean }) {
  const [metrics, setMetrics] = useState({
    sessionDuration: 0,
    cacheHitRate: 0,
    apiCallsSaved: 0,
    optimizationStatus: 'Good'
  });

  useEffect(() => {
    updateMetrics();

    if (autoRefresh) {
      const interval = setInterval(updateMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const updateMetrics = () => {
    // Calculate session duration
    const startTime = sessionStorage.getItem('sessionStart');
    if (!startTime) {
      sessionStorage.setItem('sessionStart', Date.now().toString());
    }
    const duration = Math.floor((Date.now() - parseInt(startTime || '0')) / 1000);

    // Get cache stats from localStorage
    const cacheStats = JSON.parse(localStorage.getItem('cacheStats') || '{"hits": 0, "misses": 0}');
    const hitRate = cacheStats.hits + cacheStats.misses > 0
      ? Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100)
      : 0;

    setMetrics({
      sessionDuration: duration,
      cacheHitRate: hitRate,
      apiCallsSaved: cacheStats.hits,
      optimizationStatus: hitRate > 70 ? 'Excellent' : hitRate > 40 ? 'Good' : 'Poor'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Session Duration"
          value={formatDuration(metrics.sessionDuration)}
          icon="⏱️"
        />
        <MetricCard
          label="Cache Hit Rate"
          value={`${metrics.cacheHitRate}%`}
          icon="🎯"
        />
        <MetricCard
          label="API Calls Saved"
          value={metrics.apiCallsSaved.toString()}
          icon="💾"
        />
        <MetricCard
          label="Status"
          value={metrics.optimizationStatus}
          icon="✅"
          valueColor={
            metrics.optimizationStatus === 'Excellent' ? 'text-green-600' :
            metrics.optimizationStatus === 'Good' ? 'text-blue-600' :
            'text-yellow-600'
          }
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
  valueColor?: string;
}

function MetricCard({ label, value, icon, valueColor = 'text-gray-900' }: MetricCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <div className={`text-lg font-semibold ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}
```

#### Step 2: Implement Performance Tab
```typescript
// Update PerformanceTab

function PerformanceTab({ autoRefresh }: { autoRefresh: boolean }) {
  const [metrics, setMetrics] = useState({
    componentRenders: 0,
    effectExecutions: 0,
    warnings: [] as string[]
  });

  useEffect(() => {
    // Track this component's effects
    incrementMetric('effectExecutions');

    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadMetrics = () => {
    const stored = JSON.parse(localStorage.getItem('performanceMetrics') || '{}');
    setMetrics({
      componentRenders: stored.renders || 0,
      effectExecutions: stored.effects || 0,
      warnings: stored.warnings || []
    });
  };

  const incrementMetric = (key: string) => {
    const stored = JSON.parse(localStorage.getItem('performanceMetrics') || '{}');
    stored[key] = (stored[key] || 0) + 1;
    localStorage.setItem('performanceMetrics', JSON.stringify(stored));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex justify-between items-center pb-2 border-b">
          <span className="text-sm font-medium">Component Renders</span>
          <span className="text-lg font-semibold">{metrics.componentRenders}</span>
        </div>
        <div className="flex justify-between items-center pb-2 border-b">
          <span className="text-sm font-medium">Effect Executions</span>
          <span className="text-lg font-semibold">{metrics.effectExecutions}</span>
        </div>
      </div>

      {metrics.warnings.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Performance Warnings</h4>
          <div className="space-y-2">
            {metrics.warnings.map((warning, i) => (
              <div key={i} className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Step 3: Implement Cache Tab
```typescript
// Update CacheTab

function CacheTab({ autoRefresh }: { autoRefresh: boolean }) {
  const [cacheStats, setCacheStats] = useState({
    metadata: { size: 0, hits: 0, items: 0 },
    images: { size: 0, hits: 0, items: 0 },
    audio: { size: 0, hits: 0, items: 0 }
  });

  useEffect(() => {
    loadCacheStats();

    if (autoRefresh) {
      const interval = setInterval(loadCacheStats, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadCacheStats = () => {
    const metadata = JSON.parse(localStorage.getItem('metadataCache') || '{}');
    const images = JSON.parse(localStorage.getItem('imageCache') || '{}');
    const audio = JSON.parse(localStorage.getItem('audioCache') || '{}');

    setCacheStats({
      metadata: {
        size: JSON.stringify(metadata).length,
        hits: Object.keys(metadata).length,
        items: Object.keys(metadata).length
      },
      images: {
        size: JSON.stringify(images).length,
        hits: Object.keys(images).length,
        items: Object.keys(images).length
      },
      audio: {
        size: JSON.stringify(audio).length,
        hits: Object.keys(audio).length,
        items: Object.keys(audio).length
      }
    });
  };

  const clearCache = (type: 'metadata' | 'images' | 'audio') => {
    if (confirm(`Clear ${type} cache?`)) {
      localStorage.removeItem(`${type}Cache`);
      loadCacheStats();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {['metadata', 'images', 'audio'].map((type) => {
        const stats = cacheStats[type as keyof typeof cacheStats];
        return (
          <div key={type} className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium capitalize">{type} Cache</h4>
              <button
                onClick={() => clearCache(type as any)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-gray-600">Size</div>
                <div className="font-semibold">{formatBytes(stats.size)}</div>
              </div>
              <div>
                <div className="text-gray-600">Items</div>
                <div className="font-semibold">{stats.items}</div>
              </div>
              <div>
                <div className="text-gray-600">Hits</div>
                <div className="font-semibold">{stats.hits}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

#### Step 4: Implement Bandwidth Tab
```typescript
// Update BandwidthTab

function BandwidthTab({ autoRefresh }: { autoRefresh: boolean }) {
  const [bandwidthStats, setBandwidthStats] = useState({
    totalTransfer: 0,
    cachedTransfer: 0,
    savedTransfer: 0,
    topResources: [] as Array<{ url: string; size: number; cached: boolean }>
  });

  useEffect(() => {
    loadBandwidthStats();

    if (autoRefresh) {
      const interval = setInterval(loadBandwidthStats, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadBandwidthStats = () => {
    const stats = JSON.parse(localStorage.getItem('bandwidthStats') || '{"total": 0, "cached": 0, "resources": []}');
    
    setBandwidthStats({
      totalTransfer: stats.total || 0,
      cachedTransfer: stats.cached || 0,
      savedTransfer: stats.saved || 0,
      topResources: (stats.resources || []).slice(0, 5)
    });
  };

  const clearBandwidthStats = () => {
    if (confirm('Clear bandwidth tracking data?')) {
      localStorage.removeItem('bandwidthStats');
      loadBandwidthStats();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Total Transfer</div>
          <div className="text-lg font-semibold">{formatBytes(bandwidthStats.totalTransfer)}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1">Saved</div>
          <div className="text-lg font-semibold text-green-600">{formatBytes(bandwidthStats.savedTransfer)}</div>
        </div>
      </div>

      {bandwidthStats.topResources.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Top Resources</h4>
          <div className="space-y-2">
            {bandwidthStats.topResources.map((resource, i) => (
              <div key={i} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded">
                <span className="truncate flex-1" title={resource.url}>
                  {resource.url.split('/').pop() || 'Unknown'}
                </span>
                <span className="font-semibold ml-2">{formatBytes(resource.size)}</span>
                {resource.cached && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={clearBandwidthStats}
        className="w-full text-sm text-red-600 hover:text-red-800 py-2"
      >
        Clear Bandwidth Data
      </button>
    </div>
  );
}
```

#### Step 5: Add Dashboard to Main Layout
```
ACTION: Update root layout or main app component
FILE: Likely src/app/layout.tsx or src/components/Layout.tsx
ADD: <PerformanceDashboard /> component
PLACEMENT: At end of component tree (renders as fixed position)
VERIFY: Dashboard appears on all pages
```

### Validation Criteria
```
VERIFY: All tabs display correct metrics
VERIFY: Auto-refresh updates metrics every 5 seconds
VERIFY: Clear cache buttons work
VERIFY: Metrics persist in localStorage
VERIFY: Dashboard is non-intrusive (fixed position)
```

### Testing Checkpoint
```
PAUSE FOR USER: Please test performance dashboard
1. Open performance dashboard
2. Check Overview tab shows session duration
3. Switch to Performance tab
4. Switch to Cache tab and verify cache sizes
5. Switch to Bandwidth tab
6. Test auto-refresh toggle (watch metrics update)
7. Try Generate Report button
8. Test each "Clear" button
9. Close and reopen dashboard (metrics should persist)
```

---

## TASK-10: Integration Testing

### Dependencies
- All previous tasks

### Objective
Comprehensive testing of all implemented features

### Implementation Steps

#### Step 1: Functional Testing Checklist
```
EXECUTE: Complete functional testing

Playlist System:
□ Create public playlist
□ Create private playlist  
□ Edit playlist details
□ Delete playlist
□ Add track to playlist
□ Remove track from playlist
□ View playlist with tracks
□ Access control (private vs public)

Performance Dashboard:
□ Dashboard opens/closes
□ All tabs switch correctly
□ Overview metrics update
□ Performance tracking works
□ Cache stats display
□ Bandwidth tracking works
□ Auto-refresh toggles correctly
□ Clear functions work
□ Generate report works

Integration:
□ Navigation links work
□ AddToPlaylist appears on tracks
□ Full user flow works end-to-end
□ No console errors
□ TypeScript compiles without errors
```

#### Step 2: Cross-Browser Testing
```
TEST: Verify functionality in different browsers

Chrome/Edge:
□ All features work
□ No console errors
□ UI renders correctly

Firefox:
□ All features work
□ No console errors
□ UI renders correctly

Safari (if available):
□ All features work
□ No console errors
□ UI renders correctly

Mobile browsers:
□ Responsive design works
□ Touch interactions work
□ No layout issues
```

#### Step 3: Performance Validation
```
CHECK: Verify performance metrics

Database Queries:
□ Playlist queries execute quickly (< 3 seconds)
□ RLS policies enforce correctly
□ No N+1 query problems

Frontend Performance:
□ Components render efficiently
□ No excessive re-renders
□ Smooth transitions and animations

Caching:
□ Cache hit rate improving over time
□ localStorage usage reasonable
□ No memory leaks
```

#### Step 4: Security Validation
```
VERIFY: Security measures in place

RLS Policies:
□ Users can only modify own playlists
□ Private playlists not accessible to others
□ Public playlists viewable by all
□ Track management respects ownership

Input Validation:
□ XSS protection in form inputs
□ SQL injection prevented (using Supabase client)
□ File uploads validated (if applicable)
□ Character limits enforced
```

### Validation Criteria
```
VERIFY: All checklist items pass
VERIFY: No critical bugs found
VERIFY: Performance meets benchmarks
VERIFY: Security measures active
```

### Testing Checkpoint
```
PAUSE FOR USER: Complete integration testing
Please work through all testing checklists above and report:
1. Any failing test cases
2. Any bugs or issues discovered
3. Any performance concerns
4. Any security concerns

Do not proceed until all critical issues are resolved.
```

---

## TASK-11: Documentation and Final Validation

### Dependencies
- TASK-10 (integration testing)

### Objective
Update documentation and perform final validation before completion

### Implementation Steps

#### Step 1: Update README
```markdown
ACTION: Update project README.md

ADD: Playlist System section:

## Playlist System

Users can create and manage playlists:
- Create public or private playlists
- Add/remove tracks from playlists
- Share public playlists
- Organize music collections

### Key Features:
- **Playlist Creation**: Simple form to create new playlists
- **Track Management**: Add/remove tracks with one click
- **Privacy Controls**: Public or private playlist visibility
- **Responsive Design**: Works on all devices

### Usage:
1. Navigate to Playlists page
2. Click "Create Playlist"
3. Fill in playlist details
4. Browse tracks and click "Add to Playlist"
5. View and manage your playlists

ADD: Performance Dashboard section:

## Performance Monitoring

Built-in performance dashboard for developers:
- Real-time performance metrics
- Cache monitoring
- Bandwidth tracking
- Session analytics

### Features:
- **Overview**: Session duration, cache hit rate, API calls saved
- **Performance**: Component renders, effect executions
- **Cache**: Metadata, image, and audio cache statistics
- **Bandwidth**: Transfer stats and resource tracking

### Access:
Click the "📊 Performance" button in the bottom-right corner.
```

#### Step 2: Update CHANGELOG
```markdown
ACTION: Create or update CHANGELOG.md

ADD: Month 3 Week 4 entry:

## [Month 3 Week 4] - [Current Date]

### Added
- **Playlist System**
  - Database schema for playlists and playlist_tracks
  - TypeScript types and utility functions
  - Playlist creation UI with modal support
  - Playlist display and management components
  - Track management (add/remove from playlists)
  - Public/private playlist visibility controls
  - Row Level Security policies for data protection
  - Integrated playlist navigation throughout app

- **Unified Performance Dashboard**
  - Collapsible dashboard with tabbed interface
  - Overview tab with session and cache metrics
  - Performance tab tracking renders and effects
  - Cache tab monitoring metadata, images, and audio
  - Bandwidth tab tracking data transfer
  - Auto-refresh functionality
  - Report generation capability
  - Clear cache and reset functions

### Changed
- Updated navigation to include Playlists link
- Enhanced track components with AddToPlaylist functionality
- Improved database schema with proper indexes

### Fixed
- TypeScript type errors in playlist components
- RLS policies for proper access control
- Cache statistics persistence

### Security
- Implemented RLS policies for playlists
- Added ownership checks for playlist operations
- Ensured private playlists are properly protected
```

#### Step 3: Update Steering Documents
```markdown
ACTION: Update .kiro/steering/product.md

UPDATE: Progress tracking:
- ✅ Month 3 Week 4: Playlist system and performance monitoring

ADD: Feature completion notes:
- Playlist system fully functional with public/private controls
- Performance monitoring consolidated into unified dashboard
- All TypeScript types properly defined
- Comprehensive testing completed
```

#### Step 4: Final Code Quality Check
```
ACTION: Run final checks

TypeScript:
COMMAND: npx tsc --noEmit
VERIFY: No type errors

Linting:
COMMAND: npm run lint (if available)
VERIFY: No critical linting errors

Build:
COMMAND: npm run build
VERIFY: Build succeeds without errors

Console:
ACTION: Check browser console in production
VERIFY: No errors or warnings
```

#### Step 5: Git Readiness Check
```
ACTION: Prepare for user's git commit

REVIEW: All changed files
LIST: Files to be committed:
- Database migration files
- TypeScript type files
- Component files (playlists/*, performance/*)
- Page files (playlists/*)
- Updated navigation components
- README.md
- CHANGELOG.md
- .kiro/steering/product.md

VERIFY: No sensitive data in commits
VERIFY: No unnecessary files included
```

### Validation Criteria
```
VERIFY: Documentation is complete and accurate
VERIFY: All code quality checks pass
VERIFY: Git status is clean and ready
VERIFY: No loose ends or TODOs
```

### Final Checkpoint
```
COMPLETION: Month 3 Week 4 Implementation

Summary of Deliverables:
✅ Playlist database schema with RLS
✅ Complete playlist CRUD functionality
✅ Track management in playlists
✅ Public/private playlist controls
✅ Unified performance monitoring dashboard
✅ Comprehensive testing completed
✅ Documentation updated
✅ Code quality validated

PAUSE FOR USER: Please perform final review
1. Test all features one more time
2. Review updated documentation
3. Check all files are ready for commit

If everything looks good, proceed with git commit:
```bash
git add .
git commit -m "feat: implement playlist system and unified performance dashboard

Features:
- Complete playlist CRUD with public/private controls
- Track management (add/remove from playlists)
- RLS policies for data protection
- Unified performance monitoring dashboard
- Real-time metrics tracking
- Cache and bandwidth monitoring

Database:
- Added playlists and playlist_tracks tables
- Implemented comprehensive RLS policies
- Created indexes for performance

UI/UX:
- Playlist creation modal
- Playlist display cards
- Playlist detail page with track list
- AddToPlaylist component for tracks
- Collapsible performance dashboard

Documentation:
- Updated README with new features
- Added CHANGELOG entry
- Updated steering documents

Testing: All features tested and validated
Month: 3 Week: 4 Complete"

git push origin main
```

Implementation complete! 🎉
```

---

## Error Recovery and Support

### If TypeScript Errors Occur

```
ACTION: Automatically fix TypeScript errors
PROCESS:
1. Run: npx tsc --noEmit
2. Review all errors
3. Fix each error systematically
4. Re-run type check
5. Repeat until no errors
NEVER: Proceed to next task with type errors
```

### If Database Errors Occur

```
ACTION: Debug database issues
PROCESS:
1. Check Supabase logs
2. Verify table structure
3. Check RLS policies
4. Test queries directly in Supabase
5. Fix and re-test
REQUEST: User assistance if database access issues
```

### If Tests Fail

```
ACTION: Debug and fix failing tests
PROCESS:
1. Identify failing test
2. Reproduce issue manually
3. Debug root cause
4. Implement fix
5. Re-run test
6. Verify fix doesn't break other features
PAUSE: Request user confirmation if major refactor needed
```

### If User Reports Issue During Testing

```
ACTION: Address user-reported issues
PROCESS:
1. Reproduce the issue
2. Identify root cause
3. Propose fix to user
4. Implement after approval
5. Re-test thoroughly
6. Verify issue resolved
COMMUNICATION: Keep user informed throughout fix process
```

---

## Success Criteria Summary

### Playlist System Complete When:
✅ Users can create, edit, and delete playlists
✅ Public/private playlists work correctly
✅ Tracks can be added and removed from playlists
✅ RLS policies prevent unauthorized access
✅ UI is intuitive and responsive
✅ No TypeScript or runtime errors

### Performance Dashboard Complete When:
✅ Dashboard is accessible from all pages
✅ All four tabs (Overview, Performance, Cache, Bandwidth) functional
✅ Metrics update correctly (manual and auto-refresh)
✅ Clear cache operations work
✅ Generate report功能正常
✅ UI is professional and non-intrusive

### Code Quality Complete When:
✅ No TypeScript errors
✅ No console errors or warnings
✅ Code follows project conventions
✅ Comprehensive error handling in place
✅ Proper types for all new code

### Testing Complete When:
✅ All features tested and working
✅ Cross-browser compatibility verified
✅ Mobile responsiveness confirmed
✅ Performance benchmarks met
✅ Security measures validated

---

## Implementation Complete

When all tasks are complete and all success criteria met, the Month 3 Week 4 implementation is finished. User should then commit all changes to git and update project tracking.

**Expected Outcome:**
- Fully functional playlist system integrated throughout application
- Professional-grade performance monitoring dashboard
- High-quality, well-tested code
- Comprehensive documentation
- Ready for production deployment
