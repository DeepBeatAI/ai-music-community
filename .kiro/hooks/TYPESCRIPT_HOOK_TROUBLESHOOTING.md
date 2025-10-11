# Enhanced TypeScript Hook - Troubleshooting Guide

## Common Issues and Solutions

### 1. Hook Not Triggering

#### Symptoms
- Hook doesn't activate on file save
- Manual button doesn't appear
- No response to task completion

#### Diagnosis
```bash
# Check hook configuration
cat .kiro/hooks/ts-error-checker.kiro.hook

# Verify file patterns match
ls **/*.ts **/*.tsx

# Check Kiro hook system status
# Look for hook-related messages in Kiro logs
```

#### Solutions
1. **Verify Hook is Enabled**
   ```json
   {
     "enabled": true,
     "name": "Enhanced TypeScript Error Checker"
   }
   ```

2. **Check File Patterns**
   - Ensure edited files match `**/*.ts` or `**/*.tsx` patterns
   - Verify files are within the workspace directory

3. **Restart Kiro**
   - Close and reopen Kiro to reload hook configuration
   - Check for any hook loading errors in the console

### 2. TypeScript Compiler Not Found

#### Symptoms
```
🚨 INFRASTRUCTURE ERROR: TypeScript compiler failed to execute
Command 'npx tsc' not found or permission denied
```

#### Solutions
```bash
# Install TypeScript locally
cd client
npm install --save-dev typescript

# Install TypeScript globally (alternative)
npm install -g typescript

# Verify installation
npx tsc --version

# Check PATH and permissions
which npx
ls -la node_modules/.bin/tsc
```

### 3. Configuration File Issues

#### Symptoms
- Compiler options not recognized
- Path mapping not working
- Module resolution failures

#### Solutions
```json
// tsconfig.json - Minimal working configuration
{
  "compilerOptions": {
    "target": "es2020",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", ".next"]
}
```###
 4. Infinite Loop or Stuck Iterations

#### Symptoms
- Hook runs for excessive time (>5 minutes)
- Same errors persist across all iterations
- Memory usage continuously increasing

#### Immediate Actions
1. **Stop the Hook**: Cancel the current execution if possible
2. **Check System Resources**: Monitor CPU and memory usage
3. **Review Recent Changes**: Identify what might have caused the issue

#### Diagnosis
```bash
# Check for circular dependencies
npx madge --circular src/

# Analyze TypeScript performance
npx tsc --noEmit --diagnostics

# Check file sizes and complexity
find src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n
```

#### Solutions
1. **Exclude Problematic Files**
   ```json
   // tsconfig.json
   {
     "exclude": [
       "node_modules",
       "src/problematic-file.ts",
       "src/large-generated-files/**"
     ]
   }
   ```

2. **Simplify Complex Types**
   ```typescript
   // Instead of complex nested generics
   type Complex<T, U, V> = T extends U ? V extends T ? ... : ... : ...;
   
   // Use simpler, more explicit types
   type Simple = SpecificType | AnotherType;
   ```

3. **Break Circular Dependencies**
   ```typescript
   // Move shared types to separate files
   // src/types/shared.ts
   export interface SharedType { ... }
   
   // Use dynamic imports for circular references
   const LazyComponent = lazy(() => import('./CircularComponent'));
   ```

### 5. Memory and Performance Issues

#### Symptoms
- Hook consumes excessive memory (>1GB)
- System becomes unresponsive
- TypeScript compilation takes >2 minutes

#### Solutions
1. **Increase Node.js Memory Limit**
   ```bash
   # Set memory limit for TypeScript compilation
   NODE_OPTIONS="--max-old-space-size=4096" npx tsc --noEmit
   ```

2. **Optimize TypeScript Configuration**
   ```json
   {
     "compilerOptions": {
       "skipLibCheck": true,
       "incremental": true,
       "tsBuildInfoFile": ".tsbuildinfo"
     }
   }
   ```

3. **Exclude Large Files**
   ```json
   {
     "exclude": [
       "**/*.d.ts",
       "node_modules",
       "dist",
       "build",
       "coverage"
     ]
   }
   ```

### 6. Permission and Access Issues

#### Symptoms
```
Error: EACCES: permission denied, open 'tsconfig.json'
Error: ENOENT: no such file or directory, scandir 'client'
```

#### Solutions
```bash
# Fix file permissions
chmod 644 tsconfig.json
chmod -R 755 src/

# Verify directory structure
ls -la client/
ls -la client/src/

# Check current working directory
pwd
cd client && pwd

# Verify user permissions
whoami
groups
```#
## 7. Dependency and Package Issues

#### Symptoms
- Cannot find module errors persist
- Type definitions not found
- Version conflicts between packages

#### Solutions
1. **Clean Installation**
   ```bash
   # Remove and reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   
   # Clear npm cache
   npm cache clean --force
   ```

2. **Install Missing Type Definitions**
   ```bash
   # Common type packages
   npm install --save-dev @types/node
   npm install --save-dev @types/react
   npm install --save-dev @types/react-dom
   
   # Check for available types
   npm search @types/package-name
   ```

3. **Resolve Version Conflicts**
   ```bash
   # Check for conflicting versions
   npm ls typescript
   npm ls @types/react
   
   # Update to compatible versions
   npm update typescript
   npm install @types/react@^18.0.0
   ```

### 8. False Positive Errors

#### Symptoms
- Hook reports errors that don't actually exist
- Compilation succeeds manually but hook fails
- Inconsistent error reporting

#### Diagnosis
```bash
# Manual TypeScript check
cd client
npx tsc --noEmit

# Compare with hook output
# Check for environment differences
```

#### Solutions
1. **Verify Working Directory**
   - Ensure hook runs in correct directory (`client/`)
   - Check for multiple `tsconfig.json` files

2. **Environment Consistency**
   ```bash
   # Use same Node.js version
   node --version
   npm --version
   
   # Check TypeScript version consistency
   npx tsc --version
   ./node_modules/.bin/tsc --version
   ```

3. **Clear TypeScript Cache**
   ```bash
   # Remove TypeScript build info
   rm -f .tsbuildinfo
   rm -rf .next/
   rm -rf dist/
   ```

## Emergency Procedures

### When Hook Becomes Unresponsive

1. **Immediate Actions**
   ```bash
   # Kill TypeScript processes
   pkill -f "tsc"
   pkill -f "typescript"
   
   # Check for hung Node.js processes
   ps aux | grep node
   kill -9 [process_id]
   ```

2. **System Recovery**
   ```bash
   # Free up memory
   sudo purge  # macOS
   sudo sync && echo 3 > /proc/sys/vm/drop_caches  # Linux
   
   # Restart development server
   npm run dev
   ```

3. **Hook Reset**
   - Disable hook temporarily in Kiro settings
   - Restart Kiro application
   - Re-enable hook after system stabilizes

### Data Recovery

If the hook modifies files incorrectly:

1. **Git Recovery**
   ```bash
   # View recent changes
   git diff HEAD~1
   
   # Revert specific files
   git checkout HEAD~1 -- src/problematic-file.ts
   
   # Reset all changes
   git reset --hard HEAD~1
   ```

2. **Backup Recovery**
   ```bash
   # If you have backups
   cp backup/src/file.ts src/file.ts
   
   # Use IDE history if available
   # Check .vscode/history or similar
   ```

## Prevention Strategies

### Pre-Hook Checklist
- [ ] Commit or stash uncommitted changes
- [ ] Verify TypeScript configuration is valid
- [ ] Check for recent dependency updates
- [ ] Ensure adequate system resources (>2GB RAM free)
- [ ] Review recent code changes for complexity

### Monitoring During Execution
- [ ] Watch iteration progress (should reduce errors each cycle)
- [ ] Monitor system resource usage
- [ ] Check for safety mechanism warnings
- [ ] Verify fix quality in real-time

### Post-Hook Validation
- [ ] Run manual TypeScript check: `npx tsc --noEmit`
- [ ] Test application functionality
- [ ] Review all modified files
- [ ] Run unit tests if available
- [ ] Commit changes with descriptive messages

## Getting Help

### Information to Collect
When reporting issues, include:

1. **System Information**
   ```bash
   node --version
   npm --version
   npx tsc --version
   ```

2. **Hook Configuration**
   ```bash
   cat .kiro/hooks/ts-error-checker.kiro.hook
   ```

3. **Error Output**
   - Complete hook execution log
   - TypeScript compiler output
   - System error messages

4. **Project Context**
   ```bash
   # Project structure
   find src/ -name "*.ts" -o -name "*.tsx" | head -20
   
   # Package information
   cat package.json | grep -A 10 -B 10 "typescript\|@types"
   ```

### Support Channels
- Check Kiro documentation for hook troubleshooting
- Review GitHub issues for similar problems
- Consult TypeScript documentation for compiler issues
- Consider community forums for complex type system problems