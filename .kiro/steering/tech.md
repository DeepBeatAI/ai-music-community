---
inclusion: always
---

# Technology Stack & Implementation Guidelines

## Core Stack Requirements

### Frontend (Next.js 15.4.3 + React 19.1.0)

- **App Router only** - no Pages Router patterns
- **TypeScript strict mode** - no `any` types, explicit return types
- **Tailwind CSS v4** - use utility classes, avoid custom CSS
- **Import alias**: Use `@/` for all src imports
- **State**: React Context + Supabase Realtime only (no Redux/Zustand)

### Backend (Supabase)

- **Database**: PostgreSQL 15.x with Row Level Security (RLS) on all tables
- **Auth**: Supabase Auth with JWT - check `user` in all protected routes
- **Storage**: Supabase Storage with public buckets for audio files
- **Realtime**: Use for live updates (likes, comments, follows)

### Audio Processing (Critical)

- **Wavesurfer.js v7.10.1** - only library for waveform visualization
- **fluent-ffmpeg v2.1.3** - for audio compression and format conversion
- **ALWAYS use `getCachedAudioUrl()`** - never access raw audio URLs directly
- **Format pipeline**: Accept MP3/WAV/FLAC → compress to optimized MP3
- **One player per track** - eliminate duplicate audio components

## Implementation Patterns

### Component Architecture

```typescript
// Preferred component structure
interface ComponentProps {
  // Explicit prop types
}

export function ComponentName({ prop }: ComponentProps) {
  // Implementation
}
```

### Database Queries

```typescript
// Always include RLS and error handling
const { data, error } = await supabase
  .from("table_name")
  .select("*")
  .eq("user_id", user.id);

if (error) throw error;
```

### Audio URL Processing

```typescript
// REQUIRED pattern for all audio URLs
const audioUrl = await getCachedAudioUrl(track.audio_url);
// Never use track.audio_url directly
```

## Performance Requirements

- **Page load**: < 3 seconds
- **Audio buffering**: < 2 seconds
- **Database queries**: < 100ms
- **Mobile-first**: Test on mobile screens first
- **Caching**: Implement at browser, CDN, and database layers

## Development Constraints

- **Free tier optimization** - minimize Supabase usage costs
- **No external state libraries** - use React Context only
- **TypeScript strict** - all functions must have explicit return types
- **Error boundaries** - wrap all audio components
- **Progressive loading** - never show blank states

## File Organization

- Components: PascalCase (`WavesurferPlayer.tsx`)
- Utilities: camelCase (`audioCache.ts`)
- Database: snake_case (`audio_tracks`, `user_profiles`)
- Migrations: Sequential numbering with descriptive names
