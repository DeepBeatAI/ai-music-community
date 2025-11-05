import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
// @ts-expect-error - TypeScript has issues with dynamic route segments in imports
import SingleTrackPageClient from "./SingleTrackPageClient";

// Create a server-side Supabase client for metadata generation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Type for track data with user profile
interface TrackMetadata {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  is_public: boolean;
  created_at: string;
  user: {
    username: string;
  } | null;
}

// Server-side function to fetch track data for metadata
async function fetchTrackForMetadata(trackId: string): Promise<TrackMetadata | null> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data: trackData, error } = await supabase
      .from('tracks')
      .select(`
        id,
        title,
        author,
        description,
        is_public,
        created_at,
        user_id
      `)
      .eq('id', trackId)
      .single();

    if (error) {
      console.error("Error fetching track for metadata:", error);
      return null;
    }

    if (!trackData) {
      return null;
    }

    // Fetch user profile separately
    let user = null;
    if (trackData.user_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', trackData.user_id)
        .single();
      
      user = profileData;
    }

    return {
      ...trackData,
      user: user || null,
    } as TrackMetadata;
  } catch (error) {
    console.error("Error fetching track for metadata:", error);
    return null;
  }
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const track = await fetchTrackForMetadata(id);

  if (!track) {
    return {
      title: "Track Not Found | AI Music Platform",
      description: "The track you're looking for doesn't exist or has been removed.",
    };
  }

  const trackTitle = track.title;
  const trackAuthor = track.user?.username || track.author || "Unknown Artist";
  const trackDescription = track.description || `Listen to ${trackTitle} by ${trackAuthor} on AI Music Platform`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ai-music-platform.vercel.app";
  const trackUrl = `${appUrl}/tracks/${track.id}`;
  
  // Default cover image (you can add track cover_image_url if available in the future)
  const coverImage = `${appUrl}/default-track-cover.png`;

  return {
    title: `${trackTitle} by ${trackAuthor} | AI Music Platform`,
    description: trackDescription,
    
    // Open Graph meta tags for social sharing
    openGraph: {
      title: trackTitle,
      description: trackDescription,
      type: "music.song",
      url: trackUrl,
      siteName: "AI Music Platform",
      images: [
        {
          url: coverImage,
          width: 1200,
          height: 630,
          alt: trackTitle,
        },
      ],
    },
    
    // Twitter Card meta tags
    twitter: {
      card: "summary_large_image",
      title: trackTitle,
      description: trackDescription,
      images: [coverImage],
    },
    
    // Additional meta tags
    alternates: {
      canonical: trackUrl,
    },
    
    // Robots meta tag - allow indexing for public tracks
    robots: track.is_public
      ? {
          index: true,
          follow: true,
        }
      : {
          index: false,
          follow: false,
        },
  };
}

// Server component that renders the client component
export default function SingleTrackPage() {
  return <SingleTrackPageClient />;
}
