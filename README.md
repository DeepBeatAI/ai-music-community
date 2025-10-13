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

See [Analytics Deployment Checklist](docs/features/analytics/DEPLOYMENT_CHECKLIST.md) for analytics-specific deployment steps.

## Documentation

- **Analytics System**: [docs/features/analytics/](docs/features/analytics/)
  - [System Overview](docs/features/analytics/README.md)
  - [Backfill Guide](docs/features/analytics/BACKFILL_GUIDE.md)
  - [Adding New Metrics](docs/features/analytics/ADDING_METRICS.md)
  - [Deployment Checklist](docs/features/analytics/DEPLOYMENT_CHECKLIST.md)
  - [Testing Guide](docs/features/analytics/TESTING_GUIDE.md)
- **Migrations**: [supabase/migrations/](supabase/migrations/)
- **Testing**: [docs/testing/](docs/testing/)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Submit a pull request

## License

[Your License Here]