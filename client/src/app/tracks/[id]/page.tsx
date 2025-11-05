/**
 * Single Track Page - Server Component
 *
 * This file contains the server-side logic for the single track page,
 * including metadata generation for SEO and social sharing.
 *
 * Route: /tracks/[id]
 *
 * @module SingleTrackPage
 */

import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import SingleTrackPageClient from "./SingleTrackPageClient";

/**
 * Server-side Supabase client configuration
 * Used for fetching track data during metadata generation
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Track metadata interface for SEO and social sharing
 * Contains minimal track information needed for meta tags
 */
interface TrackMetadata {
  /** Unique track identifier */
  id: string;
  /** Track title */
  title: string;
  /** Track author/artist name (may be null if not set) */
  author: string | null;
  /** Track description (may be null if not set) */
  description: string | null;
  /** Whether the track is publicly accessible */
  is_public: boolean;
  /** ISO timestamp of track creation */
  created_at: string;
  /** User profile information for the track uploader */
  user: {
    /** Username of the track uploader */
    username: string;
  } | null;
}

/**
 * Fetches track data for metadata generation
 *
 * This function runs on the server during the build process or on-demand
 * to fetch track information for generating SEO meta tags and social sharing cards.
 *
 * @param trackId - The unique identifier of the track to fetch
 * @returns Promise resolving to track metadata or null if track doesn't exist
 *
 * @example
 * ```typescript
 * const track = await fetchTrackForMetadata('123e4567-e89b-12d3-a456-426614174000');
 * if (track) {
 *   console.log(`Track: ${track.title} by ${track.user?.username}`);
 * }
 * ```
 */
async function fetchTrackForMetadata(
  trackId: string,
): Promise<TrackMetadata | null> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Use maybeSingle() instead of single() to avoid 406 errors for non-existent tracks
    const { data: trackData, error } = await supabase
      .from("tracks")
      .select(
        `
        id,
        title,
        author,
        description,
        is_public,
        created_at,
        user_id
      `,
      )
      .eq("id", trackId)
      .maybeSingle();

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
        .from("profiles")
        .select("username")
        .eq("id", trackData.user_id)
        .single();

      user = profileData;
    }

    return {
      ...trackData,
      user: user || null,
    } as TrackMetadata;
  } catch {
    // Silently handle errors for non-existent tracks
    return null;
  }
}

/**
 * Generates metadata for the single track page
 *
 * This Next.js function generates dynamic metadata for SEO optimization
 * and social media sharing. It creates Open Graph tags, Twitter Card tags,
 * and other meta information based on the track data.
 *
 * Features:
 * - Dynamic page title with track and artist name
 * - Open Graph tags for Facebook, LinkedIn, etc.
 * - Twitter Card tags for Twitter sharing
 * - Canonical URL for SEO
 * - Robots meta tag (index public tracks, noindex private tracks)
 *
 * @param params - Next.js route parameters containing the track ID
 * @returns Promise resolving to Next.js Metadata object
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-metadata
 */
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
      description:
        "The track you're looking for doesn't exist or has been removed.",
    };
  }

  const trackTitle = track.title;
  const trackAuthor = track.user?.username || track.author || "Unknown Artist";
  const trackDescription =
    track.description ||
    `Listen to ${trackTitle} by ${trackAuthor} on AI Music Platform`;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://ai-music-platform.vercel.app";
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

/**
 * Single Track Page Server Component
 *
 * This is the main server component for the single track page route.
 * It delegates rendering to the client component while providing
 * server-side metadata generation for SEO and social sharing.
 *
 * The server component pattern allows us to:
 * - Generate metadata on the server for better SEO
 * - Keep the interactive UI logic in the client component
 * - Optimize initial page load performance
 *
 * @returns JSX element rendering the client component
 */
export default function SingleTrackPage() {
  return <SingleTrackPageClient />;
}
