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

  // Fetch the actual post data for each track
  const tracks = [];
  if (playlistTracks && playlistTracks.length > 0) {
    const trackIds = playlistTracks.map((pt) => pt.track_id);
    
    // Fetch posts without join first
    console.log('Fetching posts for track IDs:', trackIds);
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, content, audio_url, audio_duration, audio_filename, user_id')
      .in('id', trackIds);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      console.error('Error details:', JSON.stringify(postsError, null, 2));
    } else {
      console.log('Successfully fetched posts:', posts?.length || 0);
    }

    // Fetch user profiles separately
    let profiles: any[] = [];
    if (posts && posts.length > 0) {
      const userIds = [...new Set(posts.map((p) => p.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);
      
      profiles = profilesData || [];
    }

    // Combine the data
    if (posts) {
      for (const pt of playlistTracks) {
        const post = posts.find((p) => p.id === pt.track_id);
        if (post) {
          const profile = profiles.find((prof) => prof.id === post.user_id);
          // Use audio_filename or content as title, fallback to "Untitled Track"
          const title = post.audio_filename || post.content?.substring(0, 50) || 'Untitled Track';
          
          tracks.push({
            id: `${pt.playlist_id}-${pt.track_id}`,
            track_id: pt.track_id,
            position: pt.position,
            added_at: pt.added_at,
            track: {
              id: post.id,
              title: title,
              artist_name: profile?.username || 'Unknown Artist',
              audio_url: post.audio_url || '',
              duration: post.audio_duration,
              cover_image_url: undefined, // posts table doesn't have cover images
            },
          });
        }
      }
    }
  }

  console.log('Fetched playlist tracks:', tracks.length, 'tracks');

  const playlistWithTracks: PlaylistWithTracks = {
    ...playlist,
    tracks,
    track_count: tracks.length,
  };

  return <PlaylistDetailClient playlist={playlistWithTracks} isOwner={isOwner} />;
}
