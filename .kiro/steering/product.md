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

### Completed Features (Month 3 Week 4)
1. ✅ **Playlist System** - Full playlist management with privacy controls
   - Create, edit, and delete playlists
   - Add and remove tracks from playlists
   - Public/private visibility controls
   - Row Level Security (RLS) for data protection
   - Optimized database queries with indexes
   - Integrated throughout application (navigation, track displays)

2. ✅ **Performance Dashboard** - Real-time monitoring for developers
   - Overview tab: session metrics and cache hit rate
   - Performance tab: render and effect tracking
   - Cache tab: detailed cache statistics
   - Bandwidth tab: transfer and savings metrics
   - Auto-refresh capability (5-second intervals)
   - LocalStorage persistence for metrics

### Completed Features (Month 4 Week 1)
3. ✅ **Playlist Playback Enhancements** - Comprehensive audio playback system
   - Sequential playlist playback with automatic track progression
   - Persistent mini player across all pages
   - Playback controls (play/pause, previous, next, seek)
   - Shuffle mode with Fisher-Yates algorithm
   - Repeat modes (off, playlist, track)
   - State persistence across page refreshes (SessionStorage)
   - Drag-and-drop track reordering for playlist owners
   - Two-section playlists page (My Playlists, Public Playlists)
   - Integration with getCachedAudioUrl for optimized loading
   - Preloading next track for seamless transitions

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

## Lessons Learned

### Month 3 Week 4 - Playlist System and Performance Dashboard

**What Worked Well**:
- **Comprehensive Planning**: Detailed requirements, design, and task breakdown led to smooth implementation
- **RLS First Approach**: Implementing Row Level Security from the start ensured data protection without retrofitting
- **Type Safety**: TypeScript types generated from database schema prevented runtime errors
- **Incremental Development**: Building foundation (database, types, utilities) before UI components reduced rework
- **Optimistic Updates**: Immediate UI feedback improved perceived performance significantly

**Challenges Overcome**:
- **Complex RLS Policies**: Nested queries for playlist_tracks required careful policy design to check playlist ownership
- **Position Management**: Automatic position calculation for tracks required thoughtful implementation to avoid gaps
- **Dashboard State Management**: Balancing auto-refresh with performance required throttling and efficient storage

**Technical Insights**:
- **Database Indexes Critical**: Indexes on foreign keys and frequently queried columns (user_id, created_at, position) dramatically improved query performance
- **Unique Constraints**: Database-level unique constraint on (playlist_id, track_id) prevented duplicate tracks more reliably than application logic
- **LocalStorage Limits**: Performance metrics storage must be carefully managed to avoid quota issues
- **Cascade Deletes**: Foreign key CASCADE delete simplified playlist deletion logic and prevented orphaned records

**Best Practices Established**:
- Always create database functions for common operations (e.g., get_playlist_track_count)
- Use triggers for automatic timestamp updates instead of application logic
- Implement comprehensive error handling with user-friendly messages
- Test RLS policies by attempting unauthorized operations
- Document all security policies and access controls
- Use optimistic updates for better UX but always handle rollback scenarios

**Future Improvements**:
- Consider implementing playlist cover image upload functionality
- ~~Add drag-and-drop track reordering in playlists~~ ✅ Completed in Month 4 Week 1
- Implement playlist sharing with shareable links
- Add playlist analytics (play counts, popular tracks)
- Consider collaborative playlists (multiple owners)
- Add export/import functionality for playlists

### Month 4 Week 1 - Playlist Playback Enhancements

**What Worked Well**:
- **Context-Based Architecture**: Using React Context for global playback state provided clean separation of concerns
- **SessionStorage Persistence**: Playback state persistence across page refreshes enhanced user experience significantly
- **AudioManager Abstraction**: Wrapping HTMLAudioElement in a class simplified event handling and resource management
- **Incremental Queue Building**: Building queue on-demand rather than upfront improved performance
- **Memoization Strategy**: Proper use of useMemo and memo prevented unnecessary re-renders in mini player

**Challenges Overcome**:
- **State Synchronization**: Keeping AudioManager, Context, and UI in sync required careful event handling
- **Shuffle Algorithm**: Implementing Fisher-Yates shuffle correctly to avoid bias in randomization
- **Drag-and-Drop UX**: Providing visual feedback during drag operations while maintaining performance
- **Repeat Mode Logic**: Handling three repeat modes (off/playlist/track) with proper queue management
- **Stale State Handling**: Implementing 1-hour TTL to prevent restoring outdated playback state

**Technical Insights**:
- **Event-Driven Architecture**: Audio events (ended, timeupdate, error) drive state updates cleanly
- **Preloading Strategy**: Preloading next track during current track playback eliminates transition delays
- **Throttled Persistence**: Throttling SessionStorage writes to 1-second intervals prevents performance issues
- **Optimistic UI**: Immediate visual feedback for drag-and-drop with background database updates
- **Context Memoization**: Memoizing context value prevents consumer re-renders when state hasn't changed

**Best Practices Established**:
- Always validate restored state before applying (check playlist exists, track exists)
- Use event-driven architecture for audio playback rather than polling
- Implement proper cleanup in useEffect hooks to prevent memory leaks
- Provide visual feedback for all user interactions (drag, mode toggles)
- Test playback across page navigation to ensure persistence works
- Use TypeScript discriminated unions for mode types (RepeatMode)

**Technical Decisions**:
- **SessionStorage over LocalStorage**: Playback state is session-specific, shouldn't persist across browser sessions
- **Context over Redux**: Simpler state management for playback, no need for complex middleware
- **HTML5 Drag and Drop**: Native API provides better performance than library-based solutions
- **Fisher-Yates Shuffle**: Industry-standard algorithm ensures unbiased randomization
- **Batch Position Updates**: Single database function call for reordering improves performance

**Future Improvements**:
- Add volume control to mini player
- Implement playback speed adjustment (0.5x, 1x, 1.5x, 2x)
- Add crossfade between tracks for smoother transitions
- Implement queue visualization and manual editing
- Add keyboard shortcuts for playback control (space, arrow keys)
- Consider implementing collaborative playlists with real-time updates
- Add playlist analytics (play counts, skip rates, popular tracks)
