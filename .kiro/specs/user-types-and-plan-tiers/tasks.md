# Implementation Plan: User Types and Plan Tiers System

## Overview

This implementation plan breaks down the user types and plan tiers system into discrete, manageable tasks. Each task builds incrementally on previous work, ensuring the system remains functional throughout development.

## Task List

- [x] 1. Database Schema Setup




- [x] 1.1 Create user_plan_tiers table with constraints and indexes


  - Write migration to create table with all columns
  - Add CHECK constraint for valid plan_tier values
  - Add unique constraint for active plan per user
  - Create indexes for performance optimization
  - Add table and column comments for documentation
  - _Requirements: 1.1, 1.3, 5.1, 5.2_

- [x] 1.2 Create user_roles table with constraints and indexes


  - Write migration to create table with all columns
  - Add CHECK constraint for valid role_type values
  - Add unique constraint for active role per user
  - Create indexes for user_id, role_type, and is_active
  - Add table and column comments for documentation
  - _Requirements: 1.1, 1.3, 5.1, 5.2_

- [x] 1.3 Create user_type_audit_log table with indexes


  - Write migration to create audit log table
  - Add CHECK constraint for valid action_type values
  - Create indexes for target_user_id, modified_by, and action_type
  - Add table and column comments for documentation
  - _Requirements: 5.1, 7.5, 8.1_

- [x] 1.4 Add deprecation comment to user_profiles.user_type column


  - Write migration to add COMMENT marking column as deprecated
  - Document migration path in comment
  - _Requirements: 5.1_

- [x] 2. Database Functions and RLS Policies





- [x] 2.1 Create utility database functions


  - Implement get_user_plan_tier() function
  - Implement get_user_roles() function
  - Implement get_user_all_types() function
  - Implement is_user_admin() function
  - Add function comments and documentation
  - _Requirements: 1.1, 6.1, 6.4_

- [x] 2.2 Create admin operation functions


  - Implement assign_plan_tier() function with admin verification
  - Implement grant_user_role() function with admin verification
  - Implement revoke_user_role() function with admin verification
  - Add audit logging to all functions
  - Add error handling and validation
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.4_

- [x] 2.3 Implement RLS policies for user_plan_tiers


  - Create policy for users to view own plan tier
  - Create policy for admins to view all plan tiers
  - Create policy for admins to modify plan tiers
  - Enable RLS on user_plan_tiers table
  - _Requirements: 5.3, 7.1, 7.2, 7.3_

- [x] 2.4 Implement RLS policies for user_roles

  - Create policy for users to view own roles
  - Create policy for admins to view all roles
  - Create policy for admins to modify roles
  - Enable RLS on user_roles table
  - _Requirements: 5.3, 7.1, 7.2, 7.3_

- [x] 2.5 Implement RLS policies for user_type_audit_log

  - Create policy for admins to view audit logs
  - Enable RLS on user_type_audit_log table
  - _Requirements: 5.3, 7.5_

- [x] 3. Data Migration







- [x] 3.1 Create migration script for existing users

  - Write SQL to migrate user_profiles.user_type to user_plan_tiers
  - Map existing values to new plan tier enum
  - Set default plan tier (free_user) for all users
  - Verify migration doesn't create duplicates
  - _Requirements: 5.1, 5.5_


- [x] 3.2 Assign initial admin role

  - Create script to grant admin role to platform owner
  - Document process for granting admin role
  - Verify admin role grants full access
  - _Requirements: 1.1, 2.1_

- [x] 3.3 Verify migration success


  - Query to verify all users have plan tier
  - Query to verify admin role assigned correctly
  - Check for any orphaned or duplicate records
  - _Requirements: 5.1, 5.5_

- [x] 4. TypeScript Type Definitions






- [x] 4.1 Create user types enums and constants

  - Create client/src/types/userTypes.ts file
  - Define PlanTier enum with all tier values
  - Define RoleType enum with all role values
  - Create display name mappings for UI
  - Create description mappings for account page
  - Create badge style mappings for UI components
  - _Requirements: 6.4_


- [x] 4.2 Create user type interfaces

  - Define UserPlanTier interface matching database schema
  - Define UserRole interface matching database schema
  - Define UserTypeInfo interface for combined data
  - Define UserTypeAuditLog interface
  - Define UserProfileWithTypes interface
  - Define UserTypeError class for error handling
  - _Requirements: 6.4_

- [x] 4.3 Update database.ts with new table types


  - Add user_plan_tiers table types (Row, Insert, Update)
  - Add user_roles table types (Row, Insert, Update)
  - Add user_type_audit_log table types (Row, Insert, Update)
  - Add database function types for all new functions
  - Regenerate types using Supabase CLI if available
  - _Requirements: 5.4, 6.4_

- [x] 5. Utility Functions and Services




- [x] 5.1 Create user type utility functions


  - Create client/src/utils/userTypes.ts file
  - Implement getUserTypeInfo() to fetch plan tier and roles
  - Implement hasRole() helper function
  - Implement hasPlanTier() helper function
  - Implement isAdmin() helper function
  - Implement formatUserTypesForDisplay() function
  - Add error handling for all functions
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 5.2 Create user type service for API calls


  - Create client/src/lib/userTypeService.ts file
  - Implement fetchUserPlanTier() function
  - Implement fetchUserRoles() function
  - Implement fetchUserAllTypes() function
  - Add caching strategy for user type data
  - Add error handling and retry logic
  - _Requirements: 6.1, 6.2_

- [x] 5.3 Create admin service for user type management


  - Create client/src/lib/adminService.ts file
  - Implement assignPlanTier() function
  - Implement grantRole() function
  - Implement revokeRole() function
  - Add authorization checks before API calls
  - Add error handling with specific error codes
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Authentication Context Updates




- [x] 6.1 Update AuthContext to include user type information


  - Modify AuthContext to fetch plan tier on login
  - Modify AuthContext to fetch roles on login
  - Add userTypeInfo to context state
  - Add isAdmin flag to context
  - Update refreshProfile() to reload user types
  - _Requirements: 6.2, 6.3_

- [x] 6.2 Add user type caching to AuthContext


  - Implement cache invalidation on user type changes
  - Add loading states for user type data
  - Add error states for user type fetch failures
  - _Requirements: 6.2_

- [x] 7. UI Component Updates




- [x] 7.1 Update UserTypeBadge component


  - Modify component to accept planTier and roles props
  - Update badge styling logic for new user types
  - Add support for multiple badges (plan tier + roles)
  - Add size prop for responsive sizing
  - Update badge colors to match design specifications
  - Add ARIA labels for accessibility
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 7.2 Update profile page to display new badges


  - Modify client/src/app/profile/[username]/page.tsx
  - Fetch user type information using utility functions
  - Pass planTier and roles to UserTypeBadge component
  - Update loading states to include user type loading
  - Update error handling for user type fetch failures
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7.3 Create PlanInformationSection component


  - Create client/src/components/account/PlanInformationSection.tsx
  - Display current plan tier name
  - Display plan tier description
  - Display all user badges (plan tier + roles)
  - Add "Change Plan" placeholder button
  - Style component to match account page design
  - Make component responsive for mobile/tablet/desktop
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 7.4 Update account page with plan information


  - Modify client/src/app/account/page.tsx
  - Add PlanInformationSection component
  - Fetch user type information from AuthContext
  - Position section between Account Information and Community Stats
  - Add loading states for plan information
  - Add error handling for plan information fetch failures
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Security Implementation





- [x] 8.1 Implement server-side authorization middleware


  - Create middleware to verify user roles on protected routes
  - Add authorization checks to API endpoints
  - Implement admin-only route protection
  - Add error responses for unauthorized access
  - _Requirements: 6.3, 7.1, 7.2, 7.3_

- [x] 8.2 Add input validation for user type operations


  - Validate plan tier values against enum
  - Validate role type values against enum
  - Sanitize all user type inputs
  - Add validation error messages
  - _Requirements: 7.3, 7.4_

- [x] 8.3 Implement audit logging in application layer


  - Log all user type modification attempts
  - Log authorization failures
  - Add structured logging for security events
  - _Requirements: 7.5, 8.1_



- [x] 9. Testing Implementation


- [x] 9.1 Automated Tests - Database Functions





  - Write tests for get_user_plan_tier() with various scenarios
  - Write tests for get_user_roles() with multiple roles
  - Write tests for assign_plan_tier() authorization and validation
  - Write tests for grant_user_role() and revoke_user_role()
  - Write tests for is_user_admin() with different user states
  - Verify all tests pass before proceeding
  - _Requirements: 6.1, 7.1, 7.2, 7.3, 7.4_

- [x] 9.2 Automated Tests - RLS Policies





  - Write tests verifying users can only view own data
  - Write tests verifying admins can view all data
  - Write tests verifying non-admins cannot modify user types
  - Write tests verifying admins can modify user types
  - Write tests for audit log access restrictions
  - Verify all tests pass before proceeding
  - _Requirements: 5.3, 7.1, 7.2, 7.3_

- [x] 9.3 Automated Tests - Utility Functions






  - Write tests for getUserTypeInfo() with various configurations
  - Write tests for hasRole() and hasPlanTier() helpers
  - Write tests for badge style selection logic
  - Write tests for display name formatting
  - Write tests for error handling scenarios
  - Verify all tests pass before proceeding
  - _Requirements: 6.1, 6.4, 6.5_

- [x] 9.4 Automated Tests - UI Components




  - Write tests for UserTypeBadge component rendering
  - Write tests for PlanInformationSection component
  - Write tests for badge display with multiple types
  - Write tests for responsive behavior
  - Write tests for accessibility features
  - Verify all tests pass before proceeding
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3_




- [x] 9.5 Automated Tests - Integration



  - Write tests for authentication flow with user types
  - Write tests for AuthContext user type loading
  - Write tests for profile page badge display
  - Write tests for account page plan information
  - Write tests for admin operations end-to-end
  - Verify all tests pass before proceeding
  - _Requirements: 3.4, 4.5, 6.2, 6.3_

- [x] 9.6 Manual Testing - UI/UX Validation

  - **Checklist for visual validation:**
    - [ ] Profile page displays correct badges for Free User
    - [ ] Profile page displays correct badges for Creator Pro
    - [ ] Profile page displays correct badges for Creator Premium
    - [ ] Profile page displays multiple badges (e.g., Creator Pro + Moderator)
    - [ ] Account page shows accurate plan tier name
    - [ ] Account page shows accurate plan tier description
    - [ ] "Change Plan" button is visible and styled correctly
    - [ ] Badge colors match design specifications
    - [ ] Badges are responsive on mobile devices (< 768px)
    - [ ] Badges are responsive on tablet devices (768px - 1024px)
    - [ ] Badges are responsive on desktop devices (> 1024px)
    - [ ] Loading states display correctly
    - [ ] Error states display user-friendly messages
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3, 4.4_

- [x] 10. Security Audit and Remediation






- [x] 10.1 Conduct comprehensive security audit


  - Test for privilege escalation vulnerabilities
  - Test for authorization bypass attempts
  - Test for SQL injection in user type fields
  - Test RLS policy effectiveness
  - Test session hijacking scenarios
  - Document all findings with severity ratings
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_


- [x] 10.2 Create remediation plan for security findings

  - Prioritize findings by severity (Critical, High, Medium, Low)
  - Create detailed remediation steps for each finding
  - Assign timelines for fixes based on severity
  - Document expected completion dates
  - _Requirements: 8.4_


- [x] 10.3 Implement critical and high-severity fixes

  - Fix all Critical severity issues
  - Fix all High severity issues
  - Verify fixes with re-testing
  - Update security documentation
  - _Requirements: 8.5_


- [x] 10.4 Validate security fixes

  - Re-run security tests for fixed issues
  - Verify no regressions introduced
  - Confirm all Critical and High issues resolved
  - Document validation results
  - _Requirements: 8.3, 8.5_



## Task Execution Notes

### Dependencies

- Tasks 1.1-1.4 must be completed before 2.x tasks (database schema required for functions)
- Tasks 2.1-2.5 must be completed before 3.x tasks (functions required for migration)
- Tasks 4.1-4.3 must be completed before 5.x tasks (types required for utilities)
- Tasks 5.1-5.3 must be completed before 6.x tasks (utilities required for context)
- Tasks 6.1-6.2 must be completed before 7.x tasks (context required for UI)
- Tasks 1-8 must be completed before 9.x tasks (implementation required for testing)
- Task 9.x must be completed before 10.x tasks (tests required for security audit)


### Testing Strategy

- **Automated tests first**: All automated tests (9.1-9.5) must pass before manual testing
- **Manual testing**: Only perform manual UI/UX validation (9.6) after automated tests pass
- **Security audit**: Conduct comprehensive audit (10.1) only after all tests pass


### Estimated Effort

- **Database Setup (Tasks 1-3)**: 4-6 hours
- **TypeScript & Utilities (Tasks 4-5)**: 4-6 hours
- **Context & UI Updates (Tasks 6-7)**: 6-8 hours
- **Security Implementation (Task 8)**: 3-4 hours
- **Testing (Task 9)**: 6-8 hours
- **Security Audit (Task 10)**: 4-6 hours
**Total Estimated Effort**: 27-38 hours

### Success Criteria

The implementation is considered complete when:

1. ✅ All database tables, functions, and RLS policies are created
2. ✅ All existing users have been migrated to new system
3. ✅ Initial admin role has been assigned
4. ✅ All TypeScript types and utilities are implemented
5. ✅ AuthContext loads user type information correctly
6. ✅ Profile page displays correct badges for all user types
7. ✅ Account page displays plan information with "Change Plan" button
8. ✅ All automated tests pass (unit, integration, E2E)
9. ✅ Manual testing checklist is complete
10. ✅ Security audit is complete with all Critical/High issues fixed

## Notes

- **Incremental Development**: Each task builds on previous tasks, allowing for incremental progress
- **Testing Focus**: Comprehensive automated testing before manual validation
- **Security Priority**: Security audit and fixes are mandatory before production deployment
- **Backward Compatibility**: Existing `user_type` column maintained during transition
- **Future Ready**: Architecture supports planned features (plan upgrades, admin dashboard, moderation tools)
