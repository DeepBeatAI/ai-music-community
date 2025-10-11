const { execSync } = require('child_process');

try {
  console.log('Checking SearchBar.tsx for TypeScript errors...');
  execSync('npx tsc --noEmit src/components/SearchBar.tsx', { 
    cwd: __dirname,
    stdio: 'inherit'
  });
  console.log('✅ No TypeScript errors in SearchBar.tsx');
} catch (error) {
  console.log('❌ TypeScript errors found');
  process.exit(1);
}
