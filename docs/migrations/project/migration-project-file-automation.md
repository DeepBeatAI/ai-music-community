# File Organization Automation

## Overview

Automated system to ensure all non-code files are created in the correct directories and automatically moved if they're accidentally placed in the wrong location.

---

## Components

### 1. Organization Scripts

#### `scripts/utilities/organize-files.sh` (Unix/Linux/Mac)
Bash script that scans for misplaced files and moves them to correct locations.

#### `scripts/utilities/organize-files.ps1` (Windows)
PowerShell script with the same functionality for Windows environments.

### 2. Git Hook

#### `.husky/pre-commit`
Automatically runs the organization script before each commit to ensure files are in the correct locations.

---

## File Organization Rules

### Documentation Files (*.md)

**Root Directory:**
- ✅ `README.md` - Keep in root
- ✅ `CHANGELOG.md` - Keep in root
- ❌ All other `.md` files → Moved based on content:
  - Contains "test" → `docs/testing/guides/`
  - Contains "migration" → `docs/migrations/`
  - Contains "security" → `docs/security/`
  - Contains "task" → `docs/tasks/`
  - Contains "review" → `docs/reviews/`
  - Default → `docs/migrations/`

**Client Directory:**
- ✅ `client/README.md` - Keep in client
- ❌ All other `.md` files → Moved based on content:
  - Contains "test" or "verification" → `docs/testing/test-results/`
  - Contains "guide" → `docs/testing/guides/`
  - Contains "quality" → `docs/reviews/`
  - Contains "task" → `docs/tasks/`
  - Default → `docs/features/`

### Test Files

**HTML Files (*.html):**
- Root or client → `tests/html/`

**Report Files:**
- `*.report.html` → `tests/reports/`
- `*.json` (except package.json, tsconfig.json) → `tests/reports/`

**Test Scripts:**
- `*.js` (except config files) → `tests/scripts/`

### Scripts

**Shell Scripts (*.sh, *.bat, *.ps1):**
- Contains "test" → `scripts/testing/`
- Contains "deploy" or "install" → `scripts/deployment/`
- Default → `scripts/utilities/`

**SQL Files (*.sql):**
- All → `scripts/database/`

---

## Usage

### Manual Run

**Unix/Linux/Mac:**
```bash
bash scripts/utilities/organize-files.sh
```

**Windows:**
```powershell
powershell -ExecutionPolicy Bypass -File scripts/utilities/organize-files.ps1
```

### Automatic Run

The script runs automatically before each commit via the git hook.

### NPM Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "organize": "bash scripts/utilities/organize-files.sh",
    "organize:win": "powershell -ExecutionPolicy Bypass -File scripts/utilities/organize-files.ps1"
  }
}
```

Then run:
```bash
npm run organize
```

---

## How It Works

### 1. Detection Phase
- Scans root directory for misplaced files
- Scans client directory for misplaced files
- Identifies file type and content

### 2. Classification Phase
- Determines correct destination based on:
  - File extension
  - Filename patterns
  - Content keywords

### 3. Organization Phase
- Creates destination directories if needed
- Moves files to correct locations
- Reports all changes

### 4. Git Integration
- Runs before each commit
- Automatically stages moved files
- Ensures commits only contain organized files

---

## Output Example

```
🔍 Checking for misplaced non-code files...

Checking root directory...
📦 Moving: test-results.md → docs/testing/test-results/test-results.md
   Reason: Test result documentation

Checking client directory...
📦 Moving: client/performance-report.html → tests/reports/performance-report.html
   Reason: Test report

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Organized 2 file(s)
⚠️  Please review the changes and commit them.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Excluded Files

The following files are never moved:

### Root Directory
- `README.md`
- `CHANGELOG.md`
- `package.json`
- `package-lock.json`
- `.gitignore`
- `.gitattributes`

### Client Directory
- `README.md`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.js`
- `jest.config.js`
- `jest.setup.js`

### Scripts
- `organize-files.sh` (the script itself)
- `organize-files.ps1` (the script itself)

---

## Customization

### Adding New Rules

Edit the scripts to add new file type rules:

```bash
# In organize-files.sh or organize-files.ps1

# Example: Move API documentation
case "$filename" in
    *api*|*API*)
        move_file "$file" "docs/api/${filename,,}" "API documentation"
        ;;
esac
```

### Changing Destinations

Modify the destination paths in the move_file calls:

```bash
# Change test results destination
move_file "$file" "docs/testing/results/$filename" "Test result"
```

---

## Troubleshooting

### Script Not Running

**Issue:** Pre-commit hook not executing

**Solution:**
```bash
# Make script executable
chmod +x scripts/utilities/organize-files.sh
chmod +x .husky/pre-commit

# Reinstall husky
npm install husky --save-dev
npx husky install
```

### Files Not Moving

**Issue:** Files detected but not moved

**Solution:**
- Check file permissions
- Ensure destination directories exist
- Run script with verbose output

### Wrong Destination

**Issue:** Files moved to incorrect location

**Solution:**
- Review filename patterns in script
- Add more specific rules for your file types
- Manually move and update script rules

---

## Benefits

### ✅ Automatic Organization
- No manual file management needed
- Consistent structure maintained
- Prevents clutter accumulation

### ✅ Prevents Mistakes
- Catches misplaced files before commit
- Ensures team consistency
- Reduces code review overhead

### ✅ Easy Maintenance
- Clear rules and patterns
- Simple to customize
- Works across platforms

### ✅ Developer Friendly
- Runs automatically
- Clear feedback
- Non-intrusive

---

## Maintenance

### Regular Updates

Review and update rules quarterly:
1. Check for new file types
2. Update destination patterns
3. Add new categories as needed
4. Test on sample files

### Team Communication

When adding new rules:
1. Document in this file
2. Notify team members
3. Update onboarding docs
4. Test with team

---

## Future Enhancements

### Potential Improvements

1. **Configuration File**
   - JSON/YAML config for rules
   - Per-project customization
   - Easier rule management

2. **Interactive Mode**
   - Ask user for confirmation
   - Suggest destinations
   - Learn from user choices

3. **Reporting**
   - Generate organization reports
   - Track file movements
   - Identify patterns

4. **Integration**
   - CI/CD pipeline checks
   - GitHub Actions
   - Pre-push hooks

---

## Related Documentation

- `docs/migrations/reorganization-final.md` - Original reorganization
- `docs/migrations/README.md` - Migrations overview
- `.husky/pre-commit` - Git hook configuration

---

**Created:** January 10, 2025  
**Status:** Active  
**Maintained By:** Development Team

---

## Quick Reference

**Run manually:**
```bash
npm run organize
```

**Disable for one commit:**
```bash
git commit --no-verify
```

**Check what would be moved:**
```bash
bash scripts/utilities/organize-files.sh --dry-run
```

**Happy organizing! 🎯**
