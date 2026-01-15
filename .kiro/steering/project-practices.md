# Project-Specific Practices

## Database Operations

### Remote Supabase Database Only

**CRITICAL: This project does NOT use a local database.**

- **Always use the remote Supabase database** for all database operations
- **Never assume a local database exists** or attempt to connect to one
- **Use Supabase MCP tools** for all database queries, migrations, and updates
- **Available operations:**
  - `mcp_supabase_execute_sql` - Execute queries on remote database
  - `mcp_supabase_apply_migration` - Apply migrations to remote database
  - `mcp_supabase_list_tables` - List tables in remote database
  - `mcp_supabase_list_migrations` - List applied migrations
  - `mcp_supabase_get_project` - Get project details

**Examples of correct approach:**
```
✅ Use mcp_supabase_execute_sql to query the remote database
✅ Use mcp_supabase_apply_migration to run migrations
✅ Use mcp_supabase_list_tables to inspect schema

❌ Don't run `supabase start` (no local instance)
❌ Don't assume localhost:54321 database
❌ Don't reference local database in instructions
```

## Debugging and Implementation Approach

### Investigate Before Acting

**Before implementing any fix or feature:**

1. **Thoroughly investigate existing code:**
   - Read all relevant files completely
   - Understand current implementation patterns
   - Identify existing utilities and helpers
   - Check for similar functionality elsewhere

2. **Verify database state:**
   - Query the remote database to understand current schema
   - Check existing data and constraints
   - Review applied migrations
   - Understand RLS policies in place

3. **Check existing functionality:**
   - Test what currently works
   - Identify what specifically is broken
   - Understand the expected behavior
   - Review related components and their interactions

4. **Ask questions when uncertain:**
   - Don't assume requirements or behavior
   - Clarify ambiguous situations with the user
   - Confirm understanding before proceeding
   - Validate assumptions explicitly

**Anti-patterns to avoid:**
```
❌ Recreating existing functionality
❌ Duplicating code that already exists
❌ Breaking working features while fixing others
❌ Assuming behavior without verification
❌ Implementing without understanding context
```

**Correct approach:**
```
✅ Read and understand existing code first
✅ Reuse existing utilities and patterns
✅ Preserve working functionality
✅ Ask clarifying questions
✅ Verify assumptions with user
```

## Task Completion Standards

### Code Quality Requirements

**Before marking any task as complete:**

1. **Run diagnostics on all modified files:**
   ```
   Use getDiagnostics tool on all changed files
   ```

2. **Fix all TypeScript errors:**
   - No type errors allowed
   - No `any` types without justification
   - Proper type definitions for all functions
   - Correct interface implementations

3. **Fix all linting errors:**
   - No ESLint errors
   - No ESLint warnings (unless explicitly justified)
   - Follow project code style
   - Proper formatting with Prettier

4. **Verify the fix works:**
   - Test the implemented functionality
   - Ensure no regressions in related features
   - Validate against requirements

**Task completion checklist:**
```
- [ ] All TypeScript errors fixed
- [ ] All linting errors fixed
- [ ] Functionality tested and working
- [ ] No regressions in existing features
- [ ] Code follows project patterns
- [ ] Documentation updated if needed
```

**Only mark task as complete when:**
- ✅ getDiagnostics shows no errors
- ✅ Code has been tested
- ✅ User has confirmed or testing validates success

## Testing Standards

### Console Output Analysis

**CRITICAL: Always read and analyze console output carefully.**

**When user says "this is pending" or shares console output:**

1. **Read the actual output carefully:**
   - Look for test pass/fail counts: "Test Suites: X passed, Tests: Y passed"
   - Distinguish between errors and warnings
   - Identify the specific issue (failure vs. warning vs. timeout)

2. **Understand what "passing" means:**
   - "Tests: 8 passed, 8 total" = **ALL TESTS PASSED**
   - "Jest did not exit one second after the test run" = **WARNING, NOT FAILURE**
   - Warnings about open handles don't mean tests failed

3. **Take appropriate action:**
   - If tests pass but Jest shows warnings → Mark task complete, note the warning
   - If tests fail → Fix the actual test failures
   - If tests timeout → Investigate the root cause
   - **Never repeat the same fix attempt multiple times without analyzing why it didn't work**

4. **Ask clarifying questions:**
   - If unsure about the output, ask user to paste the full console output
   - Don't assume what "pending" means without seeing the actual output

**Anti-patterns to avoid:**
```
❌ Saying "understood" without reading console output
❌ Treating warnings as failures
❌ Repeating the same fix attempt without analyzing results
❌ Not distinguishing between test failures and Jest exit warnings
❌ Trying to "fix" tests that are already passing
```

**Correct approach:**
```
✅ Read console output carefully before taking action
✅ Recognize "X passed, X total" means success
✅ Distinguish between test failures and warnings
✅ Mark tasks complete when tests pass, even with warnings
✅ Try different approaches if first attempt doesn't work
✅ Ask for console output if unclear
```

### Open Handles Prevention

**CRITICAL: Prevent open handles in tests to avoid Jest exit warnings.**

**Common causes of open handles:**
1. **Timers** - `setTimeout`, `setInterval` not cleared
2. **Event listeners** - Not removed in cleanup
3. **Async operations** - Promises or async functions still running after test completes
4. **React components** - Components with useEffect hooks that don't cleanup properly
5. **Mock timers** - `jest.useFakeTimers()` without `jest.useRealTimers()` in cleanup

**Best practices for writing tests:**

1. **Always cleanup after each test:**
   ```typescript
   import { cleanup } from '@testing-library/react';
   
   afterEach(() => {
     cleanup();
     jest.clearAllMocks();
   });
   ```

2. **Clear timers if using fake timers:**
   ```typescript
   afterAll(() => {
     jest.clearAllTimers();
     jest.useRealTimers();
   });
   ```

3. **Wait for async operations to complete:**
   ```typescript
   await waitFor(() => {
     expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
   });
   ```

4. **Mock components with timers:**
   - Mock audio players, video players, or any component with intervals
   - Ensure mocked components don't create real timers

5. **Use proper cleanup in components:**
   - Ensure useEffect hooks return cleanup functions
   - Clear intervals and timeouts in cleanup
   - Remove event listeners in cleanup

**When open handles occur:**
- If tests pass but Jest shows "did not exit" warning → Acceptable for now, but note for future improvement
- If tests fail due to open handles → Must fix before marking complete
- Run with `--detectOpenHandles` flag to identify the source if needed

**Example of proper test structure:**
```typescript
describe('Component Tests', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should render correctly', async () => {
    render(<Component />);
    
    await waitFor(() => {
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });
});
```

## Documentation Standards

### Documentation Minimalism Principle

**CRITICAL: Write documentation ONLY when absolutely necessary.**

**Before creating any documentation file, ask:**
1. **Is this information already documented elsewhere?**
   - Check existing files for duplicate or similar content
   - Update existing files rather than creating new ones
   - Consolidate related information in a single location

2. **Is this documentation necessary for future reference?**
   - Will this be needed for maintenance or onboarding?
   - Does it document a critical decision or pattern?
   - Is it required by SDLC best practices?

3. **Can this information live in code comments instead?**
   - Implementation details belong in code comments
   - Only architectural decisions need separate docs

**Anti-patterns to avoid:**
```
❌ Creating both README.md and summary.md with similar content
❌ Writing separate docs for each minor feature detail
❌ Duplicating information across multiple files
❌ Creating documentation "just in case"
❌ Writing guides for self-explanatory code
```

**Correct approach:**
```
✅ Single source of truth for each piece of information
✅ Update existing docs rather than creating new ones
✅ Consolidate related information
✅ Use code comments for implementation details
✅ Document only what's necessary for SDLC best practices
```

**Minimum required documentation:**
- Feature README.md (hub for the feature)
- Critical architectural decisions
- Complex setup or deployment procedures
- Non-obvious business logic or algorithms
- API contracts and interfaces

**Documentation that should be avoided:**
- Summaries that duplicate README content
- Step-by-step guides for straightforward implementations
- Redundant task tracking (use tasks.md in specs only)
- Duplicate information across multiple files

### File Organization Compliance

**ALL documentation MUST follow the file-organization.md standards:**

1. **File naming format:**
   ```
   [type]-[descriptor].md
   ```
   - All lowercase
   - Hyphens for separators
   - Type prefix (guide-, task-, test-, review-, etc.)

2. **File location:**
   ```
   docs/features/{feature}/{type}/{type}-{descriptor}.md
   ```
   - Feature-first organization
   - Type-specific subdirectories
   - Feature README.md as hub

3. **Examples:**
   ```
   ✅ docs/features/analytics/guides/guide-deployment.md
   ✅ docs/features/comments/tasks/task-01-setup.md
   ✅ docs/features/load-more/testing/test-integration-results.md
   
   ❌ docs/ANALYTICS_GUIDE.md
   ❌ analytics-guide.md (in root)
   ❌ docs/features/analytics/Guide-Deployment.md
   ```

4. **Before creating documentation:**
   - **First, check if similar documentation already exists**
   - Determine if documentation is truly necessary
   - Determine the feature it belongs to
   - Determine the type (guide, task, test, review, etc.)
   - Use correct naming convention
   - Place in correct directory structure
   - Update feature README.md with link

**Reference:** See `.kiro/steering/file-organization.md` for complete rules.

## Summary

**Key principles:**
1. **Remote database only** - Use Supabase MCP tools, never assume local database
2. **Investigate first** - Understand existing code before changing anything
3. **Quality gates** - Fix all errors before marking tasks complete
4. **Console output analysis** - Read test output carefully, distinguish failures from warnings
5. **Open handles prevention** - Write tests with proper cleanup to avoid Jest warnings
6. **Documentation minimalism** - Write only necessary docs, avoid duplication
7. **Automated testing first** - Automate tests where possible, clearly separate manual tests
8. **Documentation standards** - Follow file-organization.md conventions

**When in doubt:**
- Ask the user for clarification
- Check existing code patterns
- Verify assumptions explicitly
- Don't assume or guess
- Check if documentation already exists before creating new files
- Read console output carefully before taking action
- Don't repeat the same approach if it's not working

---

*These practices must be followed at all times during development.*
