# AI Music Community Platform
A platform for creators to share and discover AI-generated music.

## Project Status
🚧 Currently in MVP development phase (Month 1 of 8)

## Tech Stack
- Frontend: Next.js 14 with TypeScript
- Backend: Supabase (PostgreSQL, Auth, Storage)
- Styling: Tailwind CSS
- Audio: Wavesurfer.js
- Deployment: Vercel

## Key Features

### Playlist System
Create and manage collections of your favorite tracks:
- **Create Playlists**: Organize tracks into custom collections with names and descriptions
- **Privacy Controls**: Choose between public playlists (visible to all) or private playlists (personal only)
- **Track Management**: Add and remove tracks from playlists with position tracking
- **Playlist Discovery**: Browse your own playlists and discover public playlists from other users
- **Secure Access**: Row Level Security (RLS) ensures users can only modify their own playlists
- **Optimized Performance**: Indexed queries and efficient data fetching for fast load times

**Usage**:
1. Navigate to the "Playlists" section from the main navigation
2. Click "Create Playlist" to start a new collection
3. Add tracks to playlists using the "Add to Playlist" button on any track
4. View and manage your playlists from the playlists page
5. Click on a playlist to see all tracks and manage the collection

### Performance Dashboard
Real-time monitoring for developers and power users:
- **Overview Tab**: Session duration, cache hit rate, API calls saved, and optimization status
- **Performance Tab**: Component render tracking and effect execution monitoring
- **Cache Tab**: Detailed statistics for metadata, images, and audio caching
- **Bandwidth Tab**: Total transfer, cached transfer, and bandwidth savings metrics
- **Auto-Refresh**: Optional 5-second auto-refresh for live metric updates
- **Data Management**: Clear cache and bandwidth data, generate performance reports

**Access**: Click the performance dashboard button in the bottom-right corner of any page to expand the monitoring interface.

### Analytics System
Comprehensive metrics tracking with historical accuracy:
- Daily snapshots of platform activity
- Immutable historical data (survives content deletions)
- Automated daily collection via Edge Functions
- Performance-optimized queries (< 100ms)
- Extensible metric system

**Documentation**: See [Analytics System README](docs/features/analytics/README.md)

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase CLI
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/ai-music-community.git
cd ai-music-community

# Install dependencies
cd client
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

### Database Setup

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Run analytics backfill (if needed)
cd scripts
npx tsx backfill-analytics.ts
```

## Project Structure

```
├── client/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utility libraries (including analytics)
│   │   └── types/         # TypeScript type definitions
│   └── public/            # Static assets
├── supabase/              # Database schema and migrations
│   ├── migrations/        # SQL migration files
│   └── functions/         # Edge Functions (including metric collection)
├── scripts/               # Utility scripts (backfill, validation)
├── docs/                  # Project documentation
│   ├── features/          # Feature-specific docs (analytics, etc.)
│   └── testing/           # Testing guides and results
└── .kiro/                 # Kiro specs and planning documents
```

## Testing

```bash
# Run all tests
cd client
npm test

# Run analytics tests specifically
npm test -- analytics

# Run with coverage
npm test -- --coverage
```

## Deployment

See [Analytics Deployment Checklist](docs/features/analytics/guides/guide-deployment-checklist.md) for analytics-specific deployment steps.

## Documentation

- **Analytics System**: [docs/features/analytics/](docs/features/analytics/)
  - [System Overview](docs/features/analytics/README.md)
  - [Backfill Guide](docs/features/analytics/guides/guide-backfill.md)
  - [Adding New Metrics](docs/features/analytics/guides/guide-adding-metrics.md)
  - [Deployment Checklist](docs/features/analytics/guides/guide-deployment-checklist.md)
  - [Testing Guide](docs/features/analytics/guides/guide-testing.md)
- **Migrations**: [supabase/migrations/](supabase/migrations/)
- **Testing**: [docs/testing/](docs/testing/)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Submit a pull request

## License

[Your License Here]