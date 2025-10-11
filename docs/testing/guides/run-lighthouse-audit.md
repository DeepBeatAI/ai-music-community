# Lighthouse Performance Audit Guide

## Quick Start

### Option 1: Chrome DevTools (Recommended)
1. Start dev server: `npm run dev`
2. Open http://localhost:3000 in Chrome
3. Press F12 to open DevTools
4. Click "Lighthouse" tab
5. Select "Desktop" mode
6. Check "Performance" category
7. Click "Analyze page load"
8. Wait for results (30-60 seconds)

### Option 2: CLI (Advanced)
```bash
# Install Lighthouse globally
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --view --preset=desktop --only-categories=performance

# Save report
lighthouse http://localhost:3000 --output=html --output-path=./lighthouse-report.html
```

## Target Metrics
- Performance Score: > 80
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.8s

## Test Pages
- Dashboard: http://localhost:3000
- Analytics: http://localhost:3000/analytics
- Profile: http://localhost:3000/profile/[username]
