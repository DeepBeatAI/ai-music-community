---
inclusion: always
---

# AI Music Platform - Development Guidelines

## Core Implementation Rules

### Audio Processing Requirements
- **ALWAYS use `getCachedAudioUrl()`** for all audio URL processing - never access raw URLs directly
- **Eliminate duplicate audio players** - one player per track maximum
- **Implement aggressive compression** using fluent-ffmpeg for storage cost management
- **Use Wavesurfer.js v7.10.1** for all waveform visualizations
- **Support formats**: MP3, WAV, FLAC input → MP3 optimized output
- **Buffer management**: Progressive loading with retry mechanisms instead of fallback components

### Performance Standards (Non-negotiable)
- Page load: < 3 seconds
- Audio buffering: < 2 seconds
- Search response: < 1 second
- Database queries: < 100ms
- **Always implement caching**: browser → CDN → database layers

### UI/UX Patterns
- **Mobile-first responsive design** - test on mobile screens first
- **Audio-centric layouts** - waveform as primary content display
- **Touch-optimized controls** - minimum 44px touch targets
- **Loading states** - never show blank content, always provide feedback

## Code Implementation Patterns

### React Component Standards
- **Use TypeScript strict mode** - no `any` types allowed
- **Implement proper error boundaries** for audio components
- **Use React Context** for global state (auth, user preferences)
- **Prefer named exports** over default exports for utilities
- **Component naming**: PascalCase for components, camelCase for utilities

### Database Interaction Rules
- **Always use Row Level Security (RLS)** for user data protection
- **Use Supabase Realtime** for live updates (likes, comments, follows)
- **Implement optimistic updates** for better UX on social interactions
- **Snake_case naming** for database tables and columns
- **Sequential migration numbering** with descriptive names

### State Management Patterns
- **Local state** for UI interactions only
- **React Context** for user session and preferences
- **Supabase Realtime** for live data synchronization
- **No external state management libraries** (Redux, Zustand) - keep it simple

## Feature Development Priorities

### Current Sprint Focus
1. **Audio optimization** - compression and caching improvements
2. **Social features** - likes, comments, following system
3. **Search and filtering** - tag-based discovery
4. **Mobile responsiveness** - touch-first interactions

### AI-Specific Requirements
- **Mandatory AI tool disclosure** on all uploads
- **Metadata preservation** for AI-generated content provenance
- **Clear copyright indicators** for AI-generated vs human-created content

## Business Logic Implementation

### Content Rules
- **AI disclosure required** - validate on upload
- **File size limits**: 50MB max per audio file
- **Supported formats**: MP3, WAV, FLAC input only
- **Auto-compression**: Convert all uploads to optimized MP3

### User Engagement
- **Track metrics**: plays, likes, shares, comments, follows
- **Real-time notifications** for creator interactions
- **Activity feeds** based on following relationships
- **Search functionality** with tag-based filtering

## Development Constraints

### Time & Budget Limits
- **4 hours/week maximum** development time
- **Free tier optimization** - minimize costs at every decision
- **MVP-focused** - avoid feature creep, ship core functionality first

### Quality Gates
- **Test audio playback** on every change
- **Validate mobile responsiveness** before deployment
- **Update implementation status files** for major changes
- **Performance monitoring** - track load times and audio buffering
