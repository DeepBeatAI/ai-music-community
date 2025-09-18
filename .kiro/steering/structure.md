# Project Structure & Organization

## Root Directory Layout

```
├── client/                 # Next.js frontend application
├── supabase/              # Database schema, migrations, and config
├── scripts/               # Deployment and database utility scripts
├── docs/                  # Project documentation
└── *.md                   # Implementation status and testing guides
```

## Frontend Structure (`client/`)

```
client/
├── src/
│   ├── app/              # Next.js App Router pages and layouts
│   ├── components/       # Reusable React components
│   ├── config/           # Configuration files and constants
│   ├── contexts/         # React Context providers
│   ├── lib/              # Utility libraries and Supabase client
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Helper functions and utilities
│   └── middleware.ts     # Next.js middleware
├── public/               # Static assets
├── package.json          # Dependencies and scripts
├── next.config.ts        # Next.js configuration
├── tsconfig.json         # TypeScript configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## Backend Structure (`supabase/`)

```
supabase/
├── migrations/           # Database schema migrations
├── config.toml          # Supabase local development config
└── seed.sql             # Database seed data
```

## Key Conventions

### File Naming

- **Components**: PascalCase (e.g., `WavesurferPlayer.tsx`)
- **Utilities**: camelCase (e.g., `audioCache.ts`)
- **Pages**: lowercase with hyphens (App Router structure)
- **Types**: PascalCase interfaces/types in `types/` directory

### Import Patterns

- Use `@/` path alias for src imports: `import { Component } from '@/components/Component'`
- Group imports: external libraries first, then internal modules
- Prefer named exports over default exports for utilities

### Component Organization

- **Audio Components**: Specialized components for audio playback and waveform visualization
- **Shared Components**: Reusable UI components across the application
- **Page Components**: Route-specific components in the app directory

### State Management

- React Context for global state (auth, user preferences)
- Local component state for UI interactions
- Supabase Realtime for live data synchronization

### Performance Patterns

- **Audio Caching**: Use `getCachedAudioUrl()` for all audio URL processing
- **Component Optimization**: Eliminate redundant players and duplicate loading
- **Smart Loading**: Implement retry mechanisms instead of fallback components

### Database Conventions

- **Migrations**: Sequential numbering with descriptive names
- **Tables**: Snake_case naming convention
- **RLS Policies**: Implement Row Level Security for all user data
- **Storage**: Organized buckets for different media types

### Documentation

- Implementation status files track major changes and optimizations
- Testing guides provide validation procedures
- Architecture docs explain system design decisions

## Development Workflow

1. **Local Development**: Use Supabase CLI for local database
2. **Feature Development**: Create feature branches with descriptive names
3. **Testing**: Validate audio playback and performance optimizations
4. **Deployment**: Vercel for frontend, Supabase for backend services
