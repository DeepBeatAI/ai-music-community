# Admin Dashboard Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered when using or deploying the Admin Dashboard.

## Access Issues

### Cannot Access Admin Dashboard

**Symptom**: Redirected to home page when accessing `/admin`

**Possible Causes**:
1. User does not have admin role
2. Not logged in
3. Session expired
4. Middleware not configured correctly

**Solutions**:

1. **Verify Admin Role**:
   ```sql
   SELECT * FROM user_roles 
   WHERE user_id = '[your-user-id]' 
   AND role_type = 'admin' 
   AND is_active = true;
   ```
   If no results, assign admin role:
   ```sql
   SELECT assign_user_role('[your-user-id]', 'admin');
   ```

2. **Check Login Status**:
   - Log out and log back in
   - Clear browser cookies
   - Check session in browser DevTools

3. **Verify Middleware**:
   - Check `client/src/middleware.ts` exists
   - Verify admin routes in matcher config
   - Check middleware logs for errors

### Admin Link Not Visible in Navigation

**Symptom**: Admin link doesn't appear in user dropdown

**Possible Causes**:
1. AdminContext not providing admin status
2. Component not using useAdmin hook
3. Admin status not loaded yet

**Solutions**:

1. **Check AdminContext**:
   - Verify AdminProvider wraps application
   - Check browser console for errors
   - Verify `is_user_admin()` function exists

2. **Check Component**:
   ```typescript
   const { isAdmin, loading } = useAdmin();
   
   if (loading) return null; // Wait for status
   if (!isAdmin) return null; // Hide if not admin
   ```

3. **Refresh Admin Status**:
   ```typescript
   const { refreshAdminStatus } = useAdmin();
   await refreshAdminStatus();
   ```

## Data Loading Issues

### User List Not Loading

**Symptom**: User list shows loading spinner indefinitely

**Possible Causes**:
1. Database connection issue
2. RLS policy blocking access
3. Query timeout
4. Network error

**Solutions**:

1. **Check Database Connection**:
   - Verify Supabase project is active
   - Check database connection string
   - Test connection with simple query

2. **Verify RLS Policies**:
   ```sql
   -- Check if policies exist
   SELECT * FROM pg_policies 
   WHERE tablename = 'user_profiles';
   
   -- Test query as admin
   SELECT * FROM user_profiles LIMIT 1;
   ```

3. **Check Browser Console**:
   - Look for network errors
   - Check API response status
   - Verify error messages

4. **Increase Timeout**:
   - Adjust query timeout in Supabase client
   - Optimize slow queries
   - Add pagination

### Security Events Not Displaying

**Symptom**: Security tab shows no events

**Possible Causes**:
1. No events logged yet
2. RLS policy blocking access
3. Real-time subscription not working

**Solutions**:

1. **Create Test Event**:
   ```sql
   SELECT log_security_event(
     'failed_login',
     'medium',
     auth.uid(),
     '{"test": true}'::jsonb
   );
   ```

2. **Verify RLS Policy**:
   ```sql
   SELECT * FROM security_events LIMIT 1;
   ```

3. **Check Real-time Subscription**:
   - Verify Supabase Realtime enabled
   - Check browser console for subscription errors
   - Test with manual refresh

### Performance Metrics Not Updating

**Symptom**: Performance tab shows stale data

**Possible Causes**:
1. Metrics not being recorded
2. Cache not invalidating
3. Query filtering out recent data

**Solutions**:

1. **Record Test Metric**:
   ```sql
   SELECT record_system_metric(
     'page_load_time',
     1.5,
     'seconds',
     '{"test": true}'::jsonb
   );
   ```

2. **Clear Cache**:
   - Use "Clear Cache" button in dashboard
   - Clear browser cache
   - Restart application

3. **Check Time Range**:
   - Verify date range filter
   - Check timezone settings
   - Adjust query time window

## Operation Failures

### Cannot Change User Plan Tier

**Symptom**: Plan tier change fails with error

**Possible Causes**:
1. Invalid plan tier value
2. Database constraint violation
3. Audit logging failure
4. Permission denied

**Solutions**:

1. **Verify Plan Tier Value**:
   ```sql
   SELECT DISTINCT plan_tier FROM user_plan_tiers;
   ```
   Valid values: `free_user`, `creator_pro`, `creator_premium`

2. **Check Constraints**:
   ```sql
   SELECT * FROM user_plan_tiers 
   WHERE user_id = '[target-user-id]';
   ```

3. **Test Function Directly**:
   ```sql
   SELECT update_user_plan_tier(
     '[target-user-id]',
     'creator_pro'
   );
   ```

4. **Check Audit Log**:
   ```sql
   SELECT * FROM admin_audit_log 
   WHERE action_type = 'user_plan_changed'
   ORDER BY created_at DESC LIMIT 5;
   ```

### Cannot Suspend User

**Symptom**: User suspension fails

**Possible Causes**:
1. Trying to suspend admin user
2. Invalid suspension duration
3. Database function error

**Solutions**:

1. **Verify Target User**:
   ```sql
   SELECT is_user_admin('[target-user-id]');
   ```
   Cannot suspend admin users

2. **Check Suspension Duration**:
   - Must be positive integer or NULL
   - NULL = indefinite suspension

3. **Test Function**:
   ```sql
   SELECT suspend_user_account(
     '[target-user-id]',
     'Test suspension',
     7
   );
   ```

### Platform Config Not Saving

**Symptom**: Configuration changes don't persist

**Possible Causes**:
1. Invalid JSON value
2. Audit logging failure
3. Cache not invalidating
4. Permission denied

**Solutions**:

1. **Validate JSON**:
   ```javascript
   try {
     JSON.parse(configValue);
   } catch (e) {
     console.error('Invalid JSON:', e);
   }
   ```

2. **Test Function**:
   ```sql
   SELECT update_platform_config(
     'test_key',
     '{"value": "test"}'::jsonb,
     'system_setting',
     'Test config'
   );
   ```

3. **Verify Save**:
   ```sql
   SELECT * FROM platform_config 
   WHERE config_key = 'test_key';
   ```

## Performance Issues

### Dashboard Loads Slowly

**Symptom**: Dashboard takes > 5 seconds to load

**Possible Causes**:
1. Large dataset without pagination
2. Slow database queries
3. Missing indexes
4. Network latency

**Solutions**:

1. **Enable Pagination**:
   - Verify pagination controls work
   - Reduce page size if needed
   - Use cursor-based pagination

2. **Optimize Queries**:
   ```sql
   -- Check slow queries
   SELECT * FROM pg_stat_statements 
   WHERE query LIKE '%admin%'
   ORDER BY mean_exec_time DESC;
   ```

3. **Add Indexes**:
   ```sql
   -- Verify indexes exist
   SELECT indexname FROM pg_indexes 
   WHERE tablename IN (
     'admin_audit_log',
     'security_events',
     'platform_config'
   );
   ```

4. **Enable Caching**:
   - Verify cache configuration
   - Check cache hit rate
   - Adjust cache TTL

### Charts Not Rendering

**Symptom**: Analytics charts show blank or error

**Possible Causes**:
1. Chart library not loaded
2. Invalid data format
3. Browser compatibility issue
4. JavaScript error

**Solutions**:

1. **Check Browser Console**:
   - Look for JavaScript errors
   - Verify chart library loaded
   - Check data format

2. **Verify Data**:
   ```javascript
   console.log('Chart data:', chartData);
   ```

3. **Test in Different Browser**:
   - Try Chrome, Firefox, Safari
   - Check browser version
   - Disable extensions

4. **Reload Chart Library**:
   - Clear browser cache
   - Force reload (Ctrl+Shift+R)
   - Check CDN availability

## Security Issues

### Unauthorized Access Attempts

**Symptom**: Security events show unauthorized access

**Actions**:

1. **Review Event Details**:
   ```sql
   SELECT * FROM security_events 
   WHERE event_type = 'unauthorized_access'
   AND resolved = false
   ORDER BY created_at DESC;
   ```

2. **Identify Pattern**:
   - Check IP addresses
   - Review user agents
   - Look for repeated attempts

3. **Take Action**:
   - Terminate suspicious sessions
   - Block IP addresses (if needed)
   - Reset compromised passwords
   - Mark events as resolved

4. **Prevent Future Attempts**:
   - Adjust rate limits
   - Enable 2FA (future)
   - Review security policies

### Audit Log Gaps

**Symptom**: Missing audit log entries

**Possible Causes**:
1. Function not called
2. Transaction rollback
3. Permission issue
4. Database error

**Solutions**:

1. **Verify Function Calls**:
   - Check service layer code
   - Ensure `log_admin_action()` called
   - Verify transaction commits

2. **Check for Errors**:
   ```sql
   -- Check recent errors
   SELECT * FROM pg_stat_database 
   WHERE datname = current_database();
   ```

3. **Test Logging**:
   ```sql
   SELECT log_admin_action(
     'test_action',
     'test_resource',
     'test_id',
     '{"old": "value"}'::jsonb,
     '{"new": "value"}'::jsonb
   );
   ```

## Database Issues

### Migration Failures

**Symptom**: Migration fails to apply

**Solutions**:

1. **Check Migration Order**:
   - Verify dependencies applied first
   - See [Migration List](guide-migration-list.md)

2. **Check Error Message**:
   ```bash
   supabase db push --debug
   ```

3. **Verify Prerequisites**:
   - User types system applied
   - Required tables exist
   - Functions available

4. **Rollback and Retry**:
   - Rollback failed migration
   - Fix issues
   - Reapply migration

### RLS Policy Errors

**Symptom**: "permission denied" errors

**Solutions**:

1. **Verify Admin Status**:
   ```sql
   SELECT is_user_admin(auth.uid());
   ```

2. **Check Policy Exists**:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = '[table-name]';
   ```

3. **Test Policy**:
   ```sql
   -- As admin user
   SELECT * FROM admin_audit_log LIMIT 1;
   ```

4. **Recreate Policy**:
   - Drop existing policy
   - Recreate with correct definition
   - Test access

## Browser Issues

### UI Not Responsive

**Symptom**: Buttons don't work, UI frozen

**Solutions**:

1. **Check JavaScript Errors**:
   - Open browser console (F12)
   - Look for errors
   - Check network tab

2. **Clear Browser Cache**:
   - Hard reload (Ctrl+Shift+R)
   - Clear cookies
   - Clear local storage

3. **Disable Extensions**:
   - Try incognito mode
   - Disable ad blockers
   - Disable other extensions

4. **Update Browser**:
   - Check browser version
   - Update to latest
   - Try different browser

### Session Expires Quickly

**Symptom**: Logged out frequently

**Solutions**:

1. **Check Session Timeout**:
   ```sql
   SELECT * FROM platform_config 
   WHERE config_key = 'session_timeout';
   ```

2. **Adjust Timeout**:
   - Increase session duration
   - Enable "remember me"
   - Check Supabase Auth settings

3. **Check for Session Conflicts**:
   - Close other tabs
   - Clear cookies
   - Log out and back in

## Getting Help

### Before Contacting Support

1. Check this troubleshooting guide
2. Review error messages in browser console
3. Check database logs
4. Test in different browser
5. Verify admin role assigned

### Information to Provide

When contacting support, include:

- Error message (exact text)
- Browser and version
- Steps to reproduce
- Screenshots if applicable
- User ID and role
- Timestamp of issue
- Database query results (if applicable)

### Support Channels

- Review [Admin User Guide](guide-admin-user.md)
- Check [API Reference](guide-api-reference.md)
- Review [Architecture Overview](guide-architecture.md)
- Contact development team

## Related Documentation

- [Admin User Guide](guide-admin-user.md)
- [API Reference](guide-api-reference.md)
- [Database Schema](guide-database-schema.md)
- [Security Design](../security/security-design.md)
- [Deployment Checklist](guide-deployment-checklist.md)
