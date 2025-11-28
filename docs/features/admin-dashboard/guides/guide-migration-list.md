# Admin Dashboard Migration List

## Overview

This document lists all database migrations required for the Admin Dashboard feature in the order they must be applied.

## Admin Dashboard Migrations

The Admin Dashboard requires the following migrations to be applied in order:

### 1. User Types System (Prerequisites)

These migrations must be applied first as they create the foundation for admin roles:

```
20250202000000_create_user_types_system.sql
20250202000001_create_user_type_utility_functions.sql
20250202000002_create_admin_operation_functions.sql
20250202000003_create_rls_policies.sql
20250202000004_migrate_existing_users_to_plan_tiers.sql
20250202000005_assign_initial_admin_role.sql
20250202000006_verify_migration_success.sql
```

**Purpose**: Creates user roles, plan tiers, and admin role assignment system

**Dependencies**: None (foundation migrations)

### 2. Admin Dashboard Tables

```
20251119000000_create_admin_dashboard_tables.sql
```

**Purpose**: Creates all admin dashboard tables:
- `admin_audit_log` - Audit trail for admin actions
- `security_events` - Security event tracking
- `platform_config` - Platform configuration
- `system_metrics` - Performance metrics
- `user_sessions` - Session management

**Dependencies**: User types system (for admin role verification)

**Contents**:
- Table definitions with constraints
- Indexes for performance
- Comments for documentation

### 3. Admin Dashboard Functions and RLS

```
20251119000001_create_admin_functions_and_rls.sql
```

**Purpose**: Creates database functions and RLS policies:
- `log_admin_action()` - Audit logging
- `log_security_event()` - Security event logging
- `get_platform_config()` - Config retrieval
- `update_platform_config()` - Config updates
- `record_system_metric()` - Metrics recording
- `get_user_activity_summary()` - User activity
- `suspend_user_account()` - Account suspension
- `terminate_user_session()` - Session termination
- RLS policies for all admin tables

**Dependencies**: Admin dashboard tables

### 4. Bug Fixes and Enhancements

```
20251123000000_fix_activity_summary_ambiguous_columns.sql
```

**Purpose**: Fixes ambiguous column references in activity summary function

**Dependencies**: Admin dashboard functions

```
20251123000001_seed_platform_config.sql
```

**Purpose**: Seeds initial platform configuration values

**Dependencies**: Platform config table and functions

## Migration Order Summary

**Complete order for fresh installation**:

1. `20250202000000_create_user_types_system.sql`
2. `20250202000001_create_user_type_utility_functions.sql`
3. `20250202000002_create_admin_operation_functions.sql`
4. `20250202000003_create_rls_policies.sql`
5. `20250202000004_migrate_existing_users_to_plan_tiers.sql`
6. `20250202000005_assign_initial_admin_role.sql`
7. `20250202000006_verify_migration_success.sql`
8. `20251119000000_create_admin_dashboard_tables.sql`
9. `20251119000001_create_admin_functions_and_rls.sql`
10. `20251123000000_fix_activity_summary_ambiguous_columns.sql`
11. `20251123000001_seed_platform_config.sql`

## Verification Steps

After applying all migrations, verify:

### 1. Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'admin_audit_log',
  'security_events',
  'platform_config',
  'system_metrics',
  'user_sessions',
  'user_roles',
  'user_plan_tiers',
  'user_type_audit'
);
```

Expected: 8 tables

### 2. Functions Exist

```sql
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'log_admin_action',
  'log_security_event',
  'get_platform_config',
  'update_platform_config',
  'record_system_metric',
  'get_user_activity_summary',
  'suspend_user_account',
  'terminate_user_session',
  'is_user_admin',
  'assign_user_role',
  'revoke_user_role',
  'update_user_plan_tier'
);
```

Expected: 12 functions

### 3. RLS Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'admin_audit_log',
  'security_events',
  'platform_config',
  'system_metrics',
  'user_sessions'
);
```

Expected: All tables should have `rowsecurity = true`

### 4. Indexes Exist

```sql
SELECT indexname 
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'admin_audit_log',
  'security_events',
  'platform_config',
  'system_metrics',
  'user_sessions'
);
```

Expected: Multiple indexes per table

### 5. Initial Config Seeded

```sql
SELECT config_key, config_type 
FROM platform_config
WHERE is_active = true;
```

Expected: Initial configuration entries

## Rollback Procedures

### Rollback Order

Rollback in reverse order:

1. `20251123000001_seed_platform_config.sql` - Delete seeded config
2. `20251123000000_fix_activity_summary_ambiguous_columns.sql` - Revert function
3. `20251119000001_create_admin_functions_and_rls.sql` - Drop functions and policies
4. `20251119000000_create_admin_dashboard_tables.sql` - Drop tables
5. User types migrations (if needed)

### Rollback Scripts

**Drop Admin Dashboard Tables**:
```sql
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS system_metrics CASCADE;
DROP TABLE IF EXISTS platform_config CASCADE;
DROP TABLE IF EXISTS security_events CASCADE;
DROP TABLE IF EXISTS admin_audit_log CASCADE;
```

**Drop Admin Dashboard Functions**:
```sql
DROP FUNCTION IF EXISTS terminate_user_session CASCADE;
DROP FUNCTION IF EXISTS suspend_user_account CASCADE;
DROP FUNCTION IF EXISTS get_user_activity_summary CASCADE;
DROP FUNCTION IF EXISTS record_system_metric CASCADE;
DROP FUNCTION IF EXISTS update_platform_config CASCADE;
DROP FUNCTION IF EXISTS get_platform_config CASCADE;
DROP FUNCTION IF EXISTS log_security_event CASCADE;
DROP FUNCTION IF EXISTS log_admin_action CASCADE;
```

**Drop RLS Policies**:
```sql
-- Policies are dropped automatically with CASCADE
```

## Migration Timing

**Estimated execution time**:
- User types system: 5-10 seconds
- Admin dashboard tables: 2-5 seconds
- Admin dashboard functions: 5-10 seconds
- Bug fixes: 1-2 seconds
- Config seeding: 1-2 seconds

**Total**: ~15-30 seconds

## Dependencies

### External Dependencies

- PostgreSQL 15.x or higher
- Supabase Auth (for `auth.uid()` function)
- User profiles table (from initial schema)
- User stats table (for activity summary)

### Internal Dependencies

- User types system must be applied first
- Admin dashboard tables before functions
- Functions before RLS policies
- All migrations before config seeding

## Testing Migrations

### Test in Staging First

Always test migrations in staging environment:

1. Apply migrations to staging database
2. Run verification queries
3. Test admin dashboard functionality
4. Verify RLS policies work
5. Test rollback procedures
6. Document any issues

### Test Checklist

- [ ] All migrations apply without errors
- [ ] All tables created with correct schema
- [ ] All functions created and callable
- [ ] RLS policies enforce admin-only access
- [ ] Indexes created for performance
- [ ] Initial config seeded correctly
- [ ] Rollback works without data loss
- [ ] No breaking changes to existing features

## Common Issues

### Issue: Migration fails due to missing dependencies

**Solution**: Ensure user types migrations applied first

### Issue: RLS policies too restrictive

**Solution**: Verify `is_user_admin()` function works correctly

### Issue: Functions fail with permission errors

**Solution**: Ensure functions created with `SECURITY DEFINER`

### Issue: Indexes not created

**Solution**: Check for naming conflicts, drop and recreate

### Issue: Config seeding fails

**Solution**: Verify platform_config table exists and is accessible

## Related Documentation

- [Database Schema Guide](guide-database-schema.md)
- [Database Functions Guide](guide-database-functions.md)
- [Deployment Checklist](guide-deployment-checklist.md)
- [Architecture Overview](guide-architecture.md)
