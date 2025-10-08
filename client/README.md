# AI Music Community Platform

A modern social platform for AI-generated music creators and enthusiasts, built with Next.js 15.4.3 and React 19.1.0.

## Features

### Core Features
- **User Authentication**: Secure registration and login with Supabase Auth
- **Audio Upload & Playback**: Support for MP3, WAV, and FLAC formats with automatic compression
- **Waveform Visualization**: Interactive audio waveforms using Wavesurfer.js
- **Social Feed**: Browse and discover AI-generated music from the community
- **User Profiles**: Customizable profiles with bio, avatar, and music collections

### Social Engagement
- **Comments System**: Threaded comments with nested replies (up to 3 levels deep)
  - Real-time comment updates using Supabase Realtime
  - Optimistic UI for instant feedback
  - 1000 character limit with validation
  - Reply functionality for engaging discussions
- **Likes & Interactions**: Like posts and engage with the community
- **Following System**: Follow creators and build your network
- **Real-time Notifications**: Get notified of interactions on your content

### Discovery & Search
- **Tag-based Search**: Find music by genre, mood, or style
- **Creator Filtering**: Browse content by specific creators
- **Advanced Filters**: Filter by date, popularity, and more

### Analytics Dashboard
- **Platform Metrics**: View total users, posts, and comments
- **Activity Visualization**: Track user engagement over time
- **Real-time Statistics**: Live updates of platform activity
- **Access**: Available at `/analytics` for authenticated users

### Performance Optimizations
- **Database Indexing**: Optimized queries for fast data retrieval
- **Query Caching**: Client-side caching to reduce database load
- **Pagination**: Efficient loading of comments and posts
- **Audio Compression**: Automatic optimization of uploaded audio files

## Technology Stack

### Frontend
- **Framework**: Next.js 15.4.3 with App Router
- **UI Library**: React 19.1.0
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Audio Processing**: Wavesurfer.js v7.10.1, fluent-ffmpeg v2.1.3
- **State Management**: React Context + Supabase Realtime

### Backend
- **Database**: PostgreSQL 15.x (via Supabase)
- **Authentication**: Supabase Auth with JWT
- **Storage**: Supabase Storage for audio files
- **Real-time**: Supabase Realtime for live updates
- **Security**: Row Level Security (RLS) on all tables

### Development Tools
- **Testing**: Jest + React Testing Library
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Version Control**: Git with conventional commits

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm, yarn, pnpm, or bun package manager
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd client
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
Create a `.env.local` file in the client directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run database migrations:
```bash
cd ../supabase
supabase migration up
```

5. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
client/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   ├── Comment.tsx   # Individual comment component
│   │   ├── CommentList.tsx # Comment list with real-time updates
│   │   └── ...
│   ├── contexts/         # React Context providers
│   ├── lib/              # Supabase client and utilities
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Helper functions and caching
├── public/               # Static assets
└── supabase/            # Database migrations and config
```

## Key Features Documentation

### Comments System
The threaded comments system allows users to engage in discussions on posts:
- Create top-level comments or reply to existing comments
- Nested replies up to 3 levels deep for organized conversations
- Real-time updates when other users comment
- Optimistic UI for instant feedback
- Character limit of 1000 characters per comment

### Analytics Dashboard
Access platform analytics at `/analytics` (requires authentication):
- Total registered users
- Total posts created
- Total comments
- User activity charts over time

### Performance Features
- Database indexes on frequently queried columns
- Client-side query caching with TTL
- Pagination for comments (10 per page)
- Optimized audio compression on upload

## Development

### Running Tests
```bash
npm test
# or
npm run test:watch
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
```

## Deployment

### Vercel Deployment
The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new):

1. Push your code to GitHub
2. Import your repository in Vercel
3. Configure environment variables
4. Deploy

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Database Migrations
Apply migrations to production:
```bash
supabase db push
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Learn More

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial
- [Next.js GitHub repository](https://github.com/vercel/next.js)

### Supabase Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## License

[Your License Here]
