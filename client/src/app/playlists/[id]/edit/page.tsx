import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { EditPlaylistClient } from '@/components/playlists/EditPlaylistClient';

interface EditPlaylistPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPlaylistPage({ params }: EditPlaylistPageProps) {
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

  // Fetch playlist
  const { data: playlist, error } = await supabase
    .from('playlists')
    .select('*')
    .eq('id', id)
    .single();

  // If playlist not found or error, redirect to library page
  if (error || !playlist) {
    console.error('Error fetching playlist:', error);
    redirect('/library');
  }

  // Check if user is the owner
  const isOwner = playlist.user_id === session.user.id;

  // Only owner can edit
  if (!isOwner) {
    redirect(`/playlists/${id}`);
  }

  return <EditPlaylistClient playlist={playlist} />;
}
