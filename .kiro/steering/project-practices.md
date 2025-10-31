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

## Documentation Standards

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
4. **Documentation standards** - Follow file-organization.md conventions

**When in doubt:**
- Ask the user for clarification
- Check existing code patterns
- Verify assumptions explicitly
- Don't assume or guess

---

*These practices must be followed at all times during development.*
