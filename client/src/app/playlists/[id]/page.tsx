import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { PlaylistDetailClient } from '@/components/playlists/PlaylistDetailClient';
import type { PlaylistWithTracks } from '@/types/playlist';

interface PlaylistPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PlaylistPage({ params }: PlaylistPageProps) {
  const { id } = await params;
  
  // Create Supabase client for server component
  const supabase = await createClient();
  
  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch playlist first
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', id)
    .single();

  // If playlist not found or error, redirect to playlists page
  if (playlistError || !playlist) {
    console.error('Error fetching playlist:', playlistError);
    redirect('/playlists');
  }

  // Check if user is the owner
  const isOwner = playlist.user_id === session.user.id;

  // Check if user has access (owner or public playlist)
  const hasAccess = isOwner || playlist.is_public;

  // If user doesn't have access, redirect
  if (!hasAccess) {
    redirect('/playlists');
  }

  // Fetch playlist tracks (just the junction table data)
  const { data: playlistTracks, error: tracksError } = await supabase
    .from('playlist_tracks')
    .select('playlist_id, track_id, position, added_at')
    .eq('playlist_id', id)
    .order('position', { ascending: true });

  if (tracksError) {
    console.error('Error fetching playlist tracks:', tracksError);
  }

  // Fetch the actual track data
  const tracks = [];
  if (playlistTracks && playlistTracks.length > 0) {
    const trackIds = playlistTracks.map((pt) => pt.track_id);
    
    // Fetch tracks from tracks table
    console.log('Fetching tracks for track IDs:', trackIds);
    const { data: tracksData, error: tracksDataError } = await supabase
      .from('tracks')
      .select('id, title, author, description, file_url, duration, user_id')
      .in('id', trackIds);

    if (tracksDataError) {
      console.error('Error fetching tracks:', tracksDataError);
      console.error('Error details:', JSON.stringify(tracksDataError, null, 2));
    } else {
      console.log('Successfully fetched tracks:', tracksData?.length || 0);
    }

    // Combine the data
    if (tracksData) {
      for (const pt of playlistTracks) {
        const track = tracksData.find((t) => t.id === pt.track_id);
        if (track) {
          
          console.log('Track data:', {
            id: track.id,
            title: track.title,
            author: track.author,
            description: track.description,
            duration: track.duration,
            file_url: track.file_url
          });
          
          tracks.push({
            id: `${pt.playlist_id}-${pt.track_id}`,
            track_id: pt.track_id,
            position: pt.position,
            added_at: pt.added_at,
            track: {
              id: track.id,
              title: track.title || 'Untitled Track',
              author: track.author || 'Unknown Artist',
              artist_name: track.author || 'Unknown Artist', // Deprecated field for backward compatibility
              description: track.description || null,
              audio_url: track.file_url || '',
              file_url: track.file_url || '', // Add file_url for compatibility
              duration: track.duration || undefined,
              cover_image_url: undefined,
            },
          });
        }
      }
    }
  }

  console.log('Fetched playlist tracks:', tracks.length, 'tracks');

  // Fetch playlist creator's username
  let creatorUsername = 'Unknown';
  if (!isOwner) {
    const { data: creatorProfile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('user_id', playlist.user_id)
      .single();
    
    if (creatorProfile) {
      creatorUsername = creatorProfile.username;
    }
  }

  const playlistWithTracks: PlaylistWithTracks = {
    ...playlist,
    tracks,
    track_count: tracks.length,
  };

  return <PlaylistDetailClient playlist={playlistWithTracks} isOwner={isOwner} creatorUsername={!isOwner ? creatorUsername : undefined} />;
}
