#!/bin/bash

echo "Checking TypeScript types in modified files..."
echo "============================================="

cd C:/Users/maski/ai-music-community/client

# Check the main files we modified
echo "Checking posts.ts..."
npx tsc --noEmit --skipLibCheck src/utils/posts.ts 2>&1 | head -20

echo ""
echo "Checking filterManager.ts..."
npx tsc --noEmit --skipLibCheck src/utils/filterManager.ts 2>&1 | head -20

echo ""
echo "Checking creatorCache.ts..."
npx tsc --noEmit --skipLibCheck src/utils/creatorCache.ts 2>&1 | head -20

echo ""
echo "Checking dashboard page.tsx..."
npx tsc --noEmit --skipLibCheck src/app/dashboard/page.tsx 2>&1 | head -20

echo ""
echo "============================================="
echo "Type checking complete!"
