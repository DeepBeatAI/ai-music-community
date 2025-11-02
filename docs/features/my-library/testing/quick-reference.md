# Testing Quick Reference - Tasks 22-24

## At a Glance

| Task | Type | Automation | Time | Tool | Status |
|------|------|------------|------|------|--------|
| 22 | Unit Tests | 100% | 4-6h | Jest | ✅ Complete |
| 23 | Component Tests | 70% | 4-6h | RTL + Manual | ⚠️ Blocked (setup needed) |
| 24 | E2E Tests | 50% | 6-8h | Playwright + Manual | ⚠️ Blocked (setup needed) |

**Note**: Tasks 23 & 24 require infrastructure setup. Use manual testing for immediate validation.

---

## Task 22: Unit Tests ✅ COMPLETED

**What**: Test API functions  
**How**: Jest/Vitest  
**Status**: ✅ **25/25 tests passing**

```bash
# Run tests
npm test -- albums.test
npm test -- library.test

# With coverage
npm test -- --coverage
```

**Files created**: ✅
- `client/src/lib/__tests__/albums.test.ts` (11 tests)
- `client/src/lib/__tests__/library.test.ts` (14 tests)

**Tests implemented**: ✅
- getUserAlbums, createAlbum, addTrackToAlbum, reorderAlbumTracks
- getLibraryStats, getUserTracksWithMembership
- Error handling, edge cases, validation

---

## Task 23: Component Tests ⚠️ BLOCKED

**What**: Test React components  
**Status**: ⚠️ **Requires Jest/Supabase mocking setup**  
**Blocker**: ESM module transformation issues

### Issue
```
SyntaxError: Cannot use import statement outside a module
  at node_modules/isows/_esm/native.js:1
```

### Solution Required
- Configure Jest to handle Supabase ESM modules
- Create proper mock utilities
- Estimated setup time: 2-3 hours

### Workaround: Manual Testing ✅

**Use**: [manual-test-guide.md](./manual-test-guide.md) Test Suite 1

**What to verify manually**:
- Component rendering
- Visual appearance
- Responsive design
- User interactions
- Animation smoothness
- Touch interactions

**Time**: 1-2 hours of manual testing

---

## Task 24: Integration Tests ⚠️ BLOCKED

**What**: Test end-to-end flows  
**Status**: ⚠️ **Requires Playwright setup + test database**  
**Blockers**: 
- Playwright not installed
- No test database configured
- No test fixtures

### Setup Required

1. **Install Playwright**:
```bash
npm install -D @playwright/test
npx playwright install
```

2. **Create test database** (separate Supabase project)

3. **Create test fixtures** (audio files, users, data)

4. **Configure environment** (test URLs, credentials)

**Estimated setup time**: 6-8 hours

### Workaround: Manual Testing ✅

**Use**: [manual-test-guide.md](./manual-test-guide.md) Test Suites 2-5

**What to verify manually**:
- Upload → Assign → Verify flow
- Create album → Add tracks → Reorder
- Delete track → Verify cleanup
- State persistence across refresh
- Real file uploads
- Complex scenarios
- Performance
- Mobile devices

**Time**: 2-3 hours of manual testing

---

## Quick Commands

### Setup
```bash
npm install
npx playwright install
```

### Run All Tests
```bash
npm test                    # Unit + Component
npx playwright test         # E2E
```

### Run Specific Tests
```bash
npm test albums.test.ts     # Specific unit test
npm test StatsSection       # Specific component
npx playwright test upload  # Specific E2E test
```

### Coverage
```bash
npm test -- --coverage
```

### Watch Mode
```bash
npm test -- --watch
```

### Debug
```bash
npm test -- --debug
npx playwright test --debug
```

---

## Manual Testing Checklist

### Visual (Test Suite 1)
- [ ] Stats display correctly
- [ ] Track cards work
- [ ] Album cards show numbers
- [ ] Sections collapse
- [ ] Lazy loading works

### Integration (Test Suite 2)
- [ ] Upload and assign
- [ ] Create and reorder
- [ ] Delete and cleanup
- [ ] State persists

### Error Handling (Test Suite 3)
- [ ] Error boundaries work
- [ ] Upload errors handled

### Performance (Test Suite 4)
- [ ] Large data sets
- [ ] Cache behavior

### Mobile (Test Suite 5)
- [ ] Touch interactions
- [ ] Mobile layout

---

## Coverage Goals

- Unit Tests: **80%+**
- Component Tests: **70%+**
- E2E Tests: **All critical flows**

---

## When to Run

### During Development
- Unit tests: On every save (watch mode)
- Component tests: Before commit
- E2E tests: Before PR

### Before Release
- All automated tests: Must pass
- Manual tests: Full suite
- Coverage: Must meet goals

---

## Troubleshooting

### Tests Failing
```bash
npm test -- --clearCache
npm test -- -u  # Update snapshots
```

### E2E Flaky
```bash
npx playwright test --headed  # See what's happening
npx playwright test --debug   # Step through
```

### Coverage Low
```bash
npm test -- --coverage --verbose
# Check which lines not covered
```

---

## Resources

- [Automated Test Guide](./automated-test-guide.md) - Full implementation details
- [Manual Test Guide](./manual-test-guide.md) - Step-by-step manual tests
- [Testing Summary](./testing-summary.md) - Strategy and recommendations
- [Test Analysis](./test-analysis-tasks-22-24.md) - Detailed analysis

---

## Need Help?

1. Check troubleshooting section
2. Review test guides
3. Check test examples in guides
4. Ask team for help

---

**Quick Start**: 
1. Read [testing-summary.md](./testing-summary.md)
2. Implement automated tests using [automated-test-guide.md](./automated-test-guide.md)
3. Run manual tests using [manual-test-guide.md](./manual-test-guide.md)
