# Tool Configuration and Setup

## Document Information
- **Type:** Tool Configuration Specification
- **Version:** 1.0
- **Last Updated:** September 2025
- **Status:** Active

## Development Environment Setup

### Core Development Tools

#### Code Editor: VS Code Configuration
**Required Extensions:**
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "supabase.supabase-vscode",
    "ms-playwright.playwright"
  ]
}
```

**VS Code Settings Configuration:**
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "typescriptreact"
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "typescript",
    "typescriptreact": "typescriptreact"
  }
}
```

#### Terminal Setup
**Oh My Zsh Configuration:**
```bash
# Install Oh My Zsh
sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# Enable git plugin in ~/.zshrc
plugins=(git node npm)

# Useful aliases
alias ll="ls -la"
alias gs="git status"
alias gc="git commit"
alias gp="git push"
alias npm-check="npm outdated"
```

**Node Version Manager (NVM):**
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default node
```

### Project-Specific Tools

#### Supabase CLI Setup
```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Initialize in project
supabase init

# Start local development
supabase start
```

#### Vercel CLI Setup
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Set up environment variables
vercel env add
```

#### GitHub CLI Setup
```bash
# Install GitHub CLI (macOS)
brew install gh

# Authenticate
gh auth login

# Configure for repository
gh repo clone [username]/ai-music-community
```

### Audio Development Tools

#### Web Audio API Development Setup
**Browser Testing Setup:**
- Chrome DevTools Audio Context inspection
- Firefox Web Audio debugging tools
- Safari Web Inspector audio analysis

**Audio Testing Assets:**
```
project/
├── audio-samples/
│   ├── test-short.wav (5 seconds)
│   ├── test-medium.mp3 (30 seconds)
│   ├── test-long.wav (2 minutes)
│   └── formats/
│       ├── sample.wav
│       ├── sample.mp3
│       ├── sample.ogg
│       └── sample.flac
```

**Wavesurfer.js Development Setup:**
```javascript
// Audio development utilities
const audioTestUtils = {
  loadTestFile: (filename) => `./audio-samples/${filename}`,
  validateAudioFormat: (file) => {
    const validTypes = ['audio/wav', 'audio/mp3', 'audio/ogg', 'audio/flac'];
    return validTypes.includes(file.type);
  },
  getAudioDuration: async (audioBuffer) => {
    return audioBuffer.duration;
  }
};
```

## Project Management Tools

### GitHub Projects Configuration

#### Board Setup
**Project Board Columns:**
1. **📋 Backlog** - Features planned for future sprints
2. **🔄 In Progress** - Currently being worked on  
3. **👀 Review** - Ready for code review
4. **✅ Done** - Completed and tested
5. **🚀 Deployed** - Live on production
6. **⚠️ Blocked** - Waiting on external dependencies

#### Issue Labels Configuration
```yaml
# GitHub issue labels
labels:
  - name: "🐛 bug"
    color: "d73a4a"
    description: "Something isn't working"
  
  - name: "✨ enhancement" 
    color: "a2eeef"
    description: "New feature or request"
    
  - name: "📖 documentation"
    color: "0075ca"
    description: "Improvements to docs"
    
  - name: "🚨 high-priority"
    color: "b60205" 
    description: "Critical items"
    
  - name: "⚖️ legal"
    color: "fbca04"
    description: "Legal/compliance related"
    
  - name: "🎵 audio"
    color: "7057ff"
    description: "Audio processing related"
    
  - name: "👥 community"
    color: "008672"
    description: "Community features"
    
  - name: "💰 monetization"
    color: "006b75"
    description: "Revenue-related features"
    
  - name: "🔐 security"
    color: "d4c5f9"
    description: "Security improvements"
    
  - name: "📱 mobile"
    color: "c2e0c6"
    description: "Mobile/PWA specific"
```

#### Milestone Configuration
**Project Milestones:**
- **MVP Launch** (Month 8) - Core functionality complete
- **Legal Entity Setup** (Month 9) - Business foundation established
- **Monetization Live** (Month 12) - Revenue generation operational
- **International Launch** (Month 16) - Multi-market presence
- **Mobile App** (Month 18) - Native mobile applications
- **Enterprise Features** (Month 24) - B2B product suite

### Quality Assurance Tools

#### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-console": "warn"
  }
}
```

#### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 80,
  "endOfLine": "lf"
}
```

#### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Testing Tools Configuration

#### Jest Configuration
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}

module.exports = createJestConfig(customJestConfig)
```

#### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox', 
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Environment Management

### Environment Variable Setup
```bash
# .env.local (development)
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI API (when implemented)
OPENAI_API_KEY=your_openai_key

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

### Deployment Environment Setup
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm run test:ci
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## Productivity and Organization Tools

### Time Tracking Setup
**Daily Development Log Template:**
```markdown
# Development Log - [DATE]

## Time Allocation
**Total Time:** [HOURS]
**Phase:** [MVP/Business Foundation/Growth]

## Tasks Completed
- [ ] [Task 1] - [Time spent]
- [ ] [Task 2] - [Time spent] 
- [ ] [Task 3] - [Time spent]

## Next Session Goals
- [ ] [Goal 1]
- [ ] [Goal 2]

## Blockers/Issues
- [Issue description and resolution plan]

## Learning Notes
- [New concepts learned or technologies explored]

## Git Commits
- [List of commits made during session]
```

### Browser Setup for Development
**Essential Browser Extensions:**
- React Developer Tools
- Redux DevTools
- Web Developer
- JSON Viewer
- GitHub Code Review
- Grammarly (for documentation)

**Bookmark Organization:**
```
Development/
├── Documentation/
│   ├── Next.js Docs
│   ├── React Docs  
│   ├── TypeScript Handbook
│   ├── Tailwind CSS Docs
│   └── Supabase Docs
├── Tools/
│   ├── GitHub Repository
│   ├── Vercel Dashboard
│   ├── Supabase Dashboard
│   └── NPM Package Search
└── Learning/
    ├── Web Audio API MDN
    ├── AI Music Generation Research
    └── Startup Resources
```

### Password and Security Management
**1Password Configuration:**
- Development credentials vault
- API keys and tokens vault
- SSH keys management
- Secure note templates for configurations

**Security Checklist:**
- [ ] Two-factor authentication enabled on all services
- [ ] SSH keys properly configured
- [ ] Environment variables secured
- [ ] API keys rotated regularly
- [ ] Backup procedures tested

---

*Tool Configuration Version: 1.0*  
*Last Updated: September 2025*  
*Next Review: Monthly tool evaluation and updates*