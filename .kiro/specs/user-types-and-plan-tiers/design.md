# Design Document: User Types and Plan Tiers System

## Overview

This document outlines the technical design for implementing a comprehensive user type and plan tier system for the AI Music Community Platform. The system will support role-based access control (Admin, Tester, Moderator) combined with subscription tiers (Free User, Creator Pro, Creator Premium), enabling flexible privilege management and feature differentiation.

### Key Design Principles

1. **Security First**: All authorization checks performed server-side with database-level RLS policies
2. **Flexible Combinations**: Support multiple roles per user while maintaining exactly one plan tier
3. **Scalability**: Design supports future features (plan upgrades, admin interfaces, moderation tools)
4. **Backward Compatibility**: Migrate existing users seamlessly to new system
5. **Type Safety**: Comprehensive TypeScript types for all user type operations

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Profile Page │  │ Account Page │  │ Auth Context │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  User Type      │                        │
│                   │  Utilities      │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Supabase API   │
                    └────────┬────────┘
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                    Database Layer                             │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │ user_profiles    │  │ user_plan_tiers  │                  │
│  │ - user_type      │  │ - user_id        │                  │
│  │   (deprecated)   │  │ - plan_tier      │                  │
│  └──────────────────┘  │ - is_active      │                  │
│                        └──────────────────┘                  │
│  ┌──────────────────┐                                        │
│  │ user_roles       │                                        │
│  │ - user_id        │                                        │
│  │ - role_type      │                                        │
│  │ - granted_by     │                                        │
│  └──────────────────┘                                        │
│                                                               │
│  ┌──────────────────────────────────────────┐                │
│  │         Row Level Security (RLS)         │                │
│  │  - Plan tier read policies               │                │
│  │  - Role assignment policies (Admin only) │                │
│  │  - Audit log policies                    │                │
│  └──────────────────────────────────────────┘                │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Authentication**: User logs in via Supabase Auth
2. **Profile Loading**: AuthContext fetches user profile with plan tier and roles
3. **Authorization Check**: Utilities validate user permissions for protected actions
4. **Badge Display**: UI components render badges based on database values
5. **Admin Actions**: Admin users can modify user types through secure endpoints

## Components and Interfaces

### Database Schema

#### New Table: `user_plan_tiers`

Stores the subscription tier for each user (one active tier per user).

```sql
CREATE TABLE user_plan_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('free_user', 'creator_pro', 'creator_premium')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure only one active plan tier per user
  CONSTRAINT unique_active_plan_per_user UNIQUE (user_id, is_active) 
    WHERE (is_active = true)
);

-- Indexes for performance
CREATE INDEX idx_user_plan_tiers_user_id ON user_plan_tiers(user_id);
CREATE INDEX idx_user_plan_tiers_active ON user_plan_tiers(user_id, is_active) 
  WHERE is_active = true;
```

#### New Table: `user_roles`

Stores additional roles that can be combined with plan tiers.

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('admin', 'moderator', 'tester')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate active roles for same user
  CONSTRAINT unique_active_role_per_user UNIQUE (user_id, role_type, is_active)
    WHERE (is_active = true)
);

-- Indexes for performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_active ON user_roles(user_id, is_active) 
  WHERE is_active = true;
CREATE INDEX idx_user_roles_type ON user_roles(role_type, is_active) 
  WHERE is_active = true;
```

#### New Table: `user_type_audit_log`

Tracks all user type and role modifications for security auditing.

```sql
CREATE TABLE user_type_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  modified_by UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'plan_tier_assigned', 
    'plan_tier_changed', 
    'role_granted', 
    'role_revoked'
  )),
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit queries
CREATE INDEX idx_audit_target_user ON user_type_audit_log(target_user_id, created_at DESC);
CREATE INDEX idx_audit_modified_by ON user_type_audit_log(modified_by, created_at DESC);
CREATE INDEX idx_audit_action_type ON user_type_audit_log(action_type, created_at DESC);
```

#### Modified Table: `user_profiles`

The existing `user_type` column will be deprecated but maintained for backward compatibility during migration.

```sql
-- Add comment to mark as deprecated
COMMENT ON COLUMN user_profiles.user_type IS 
  'DEPRECATED: Use user_plan_tiers and user_roles tables instead. 
   Maintained for backward compatibility during migration.';
```

### Row Level Security (RLS) Policies

#### `user_plan_tiers` RLS Policies

```sql
-- Users can view their own plan tier
CREATE POLICY "Users can view own plan tier"
  ON user_plan_tiers FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all plan tiers
CREATE POLICY "Admins can view all plan tiers"
  ON user_plan_tiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Only admins can modify plan tiers
CREATE POLICY "Only admins can modify plan tiers"
  ON user_plan_tiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );
```



#### `user_roles` RLS Policies

```sql
-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles AS admin_check
      WHERE admin_check.user_id = auth.uid()
        AND admin_check.role_type = 'admin'
        AND admin_check.is_active = true
    )
  );

-- Only admins can grant or revoke roles
CREATE POLICY "Only admins can modify roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles AS admin_check
      WHERE admin_check.user_id = auth.uid()
        AND admin_check.role_type = 'admin'
        AND admin_check.is_active = true
    )
  );
```

#### `user_type_audit_log` RLS Policies

```sql
-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
  ON user_type_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Audit log inserts are handled by database functions (no direct INSERT policy)
```

### Database Functions

#### Function: `get_user_plan_tier`

Returns the active plan tier for a user.

```sql
CREATE OR REPLACE FUNCTION get_user_plan_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_tier TEXT;
BEGIN
  SELECT plan_tier INTO v_plan_tier
  FROM user_plan_tiers
  WHERE user_id = p_user_id
    AND is_active = true
  LIMIT 1;
  
  -- Default to 'free_user' if no plan tier found
  RETURN COALESCE(v_plan_tier, 'free_user');
END;
$$;
```

#### Function: `get_user_roles`

Returns all active roles for a user as an array.

```sql
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_roles TEXT[];
BEGIN
  SELECT ARRAY_AGG(role_type ORDER BY role_type)
  INTO v_roles
  FROM user_roles
  WHERE user_id = p_user_id
    AND is_active = true;
  
  RETURN COALESCE(v_roles, ARRAY[]::TEXT[]);
END;
$$;
```

#### Function: `get_user_all_types`

Returns plan tier and roles combined for display purposes.

```sql
CREATE OR REPLACE FUNCTION get_user_all_types(p_user_id UUID)
RETURNS TABLE(
  plan_tier TEXT,
  roles TEXT[],
  all_types TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_tier TEXT;
  v_roles TEXT[];
  v_all_types TEXT[];
BEGIN
  -- Get plan tier
  v_plan_tier := get_user_plan_tier(p_user_id);
  
  -- Get roles
  v_roles := get_user_roles(p_user_id);
  
  -- Combine for display (plan tier + roles)
  v_all_types := ARRAY[v_plan_tier] || COALESCE(v_roles, ARRAY[]::TEXT[]);
  
  RETURN QUERY SELECT v_plan_tier, v_roles, v_all_types;
END;
$$;
```

#### Function: `assign_plan_tier`

Assigns or changes a user's plan tier (Admin only).

```sql
CREATE OR REPLACE FUNCTION assign_plan_tier(
  p_target_user_id UUID,
  p_new_plan_tier TEXT,
  p_admin_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_plan_tier TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_admin_user_id
      AND role_type = 'admin'
      AND is_active = true
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can assign plan tiers';
  END IF;
  
  -- Validate plan tier
  IF p_new_plan_tier NOT IN ('free_user', 'creator_pro', 'creator_premium') THEN
    RAISE EXCEPTION 'Invalid plan tier: %', p_new_plan_tier;
  END IF;
  
  -- Get current plan tier
  v_old_plan_tier := get_user_plan_tier(p_target_user_id);
  
  -- Deactivate old plan tier
  UPDATE user_plan_tiers
  SET is_active = false,
      updated_at = now()
  WHERE user_id = p_target_user_id
    AND is_active = true;
  
  -- Insert new plan tier
  INSERT INTO user_plan_tiers (user_id, plan_tier, is_active)
  VALUES (p_target_user_id, p_new_plan_tier, true);
  
  -- Log the change
  INSERT INTO user_type_audit_log (
    target_user_id,
    modified_by,
    action_type,
    old_value,
    new_value
  ) VALUES (
    p_target_user_id,
    p_admin_user_id,
    CASE 
      WHEN v_old_plan_tier IS NULL THEN 'plan_tier_assigned'
      ELSE 'plan_tier_changed'
    END,
    v_old_plan_tier,
    p_new_plan_tier
  );
  
  RETURN true;
END;
$$;
```

#### Function: `grant_user_role`

Grants a role to a user (Admin only).

```sql
CREATE OR REPLACE FUNCTION grant_user_role(
  p_target_user_id UUID,
  p_role_type TEXT,
  p_admin_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_role_exists BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_admin_user_id
      AND role_type = 'admin'
      AND is_active = true
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can grant roles';
  END IF;
  
  -- Validate role type
  IF p_role_type NOT IN ('admin', 'moderator', 'tester') THEN
    RAISE EXCEPTION 'Invalid role type: %', p_role_type;
  END IF;
  
  -- Check if role already exists and is active
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_target_user_id
      AND role_type = p_role_type
      AND is_active = true
  ) INTO v_role_exists;
  
  IF v_role_exists THEN
    RAISE EXCEPTION 'User already has role: %', p_role_type;
  END IF;
  
  -- Grant the role
  INSERT INTO user_roles (user_id, role_type, granted_by, is_active)
  VALUES (p_target_user_id, p_role_type, p_admin_user_id, true)
  ON CONFLICT (user_id, role_type, is_active) WHERE is_active = true
  DO UPDATE SET
    granted_at = now(),
    granted_by = p_admin_user_id,
    revoked_at = NULL;
  
  -- Log the change
  INSERT INTO user_type_audit_log (
    target_user_id,
    modified_by,
    action_type,
    new_value
  ) VALUES (
    p_target_user_id,
    p_admin_user_id,
    'role_granted',
    p_role_type
  );
  
  RETURN true;
END;
$$;
```

#### Function: `revoke_user_role`

Revokes a role from a user (Admin only).

```sql
CREATE OR REPLACE FUNCTION revoke_user_role(
  p_target_user_id UUID,
  p_role_type TEXT,
  p_admin_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_admin_user_id
      AND role_type = 'admin'
      AND is_active = true
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can revoke roles';
  END IF;
  
  -- Prevent revoking own admin role
  IF p_target_user_id = p_admin_user_id AND p_role_type = 'admin' THEN
    RAISE EXCEPTION 'Cannot revoke your own admin role';
  END IF;
  
  -- Revoke the role
  UPDATE user_roles
  SET is_active = false,
      revoked_at = now()
  WHERE user_id = p_target_user_id
    AND role_type = p_role_type
    AND is_active = true;
  
  -- Log the change
  INSERT INTO user_type_audit_log (
    target_user_id,
    modified_by,
    action_type,
    old_value
  ) VALUES (
    p_target_user_id,
    p_admin_user_id,
    'role_revoked',
    p_role_type
  );
  
  RETURN true;
END;
$$;
```

#### Function: `is_user_admin`

Quick check if a user has admin role.

```sql
CREATE OR REPLACE FUNCTION is_user_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND role_type = 'admin'
      AND is_active = true
  );
END;
$$;
```



## Data Models

### TypeScript Type Definitions

#### Enums and Constants

```typescript
// client/src/types/userTypes.ts

/**
 * Plan tier enumeration
 * Represents subscription levels for non-admin users
 */
export enum PlanTier {
  FREE_USER = 'free_user',
  CREATOR_PRO = 'creator_pro',
  CREATOR_PREMIUM = 'creator_premium',
}

/**
 * Role type enumeration
 * Represents additional privileges that can be combined with plan tiers
 */
export enum RoleType {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  TESTER = 'tester',
}

/**
 * Display names for plan tiers
 */
export const PLAN_TIER_DISPLAY_NAMES: Record<PlanTier, string> = {
  [PlanTier.FREE_USER]: 'Free User',
  [PlanTier.CREATOR_PRO]: 'Creator Pro',
  [PlanTier.CREATOR_PREMIUM]: 'Creator Premium',
};

/**
 * Display names for roles
 */
export const ROLE_TYPE_DISPLAY_NAMES: Record<RoleType, string> = {
  [RoleType.ADMIN]: 'Admin',
  [RoleType.MODERATOR]: 'Moderator',
  [RoleType.TESTER]: 'Tester',
};

/**
 * Plan tier descriptions for account page
 */
export const PLAN_TIER_DESCRIPTIONS: Record<PlanTier, string> = {
  [PlanTier.FREE_USER]: 
    'Access to basic features including track uploads, playlists, and community interaction.',
  [PlanTier.CREATOR_PRO]: 
    'Enhanced creator features with increased upload limits, advanced analytics, and priority support.',
  [PlanTier.CREATOR_PREMIUM]: 
    'Full platform access with unlimited uploads, premium analytics, collaboration tools, and dedicated support.',
};

/**
 * Badge color schemes for UI display
 */
export const PLAN_TIER_BADGE_STYLES: Record<PlanTier, string> = {
  [PlanTier.FREE_USER]: 'bg-gray-700 text-gray-300 border-gray-600',
  [PlanTier.CREATOR_PRO]: 'bg-yellow-700 text-yellow-200 border-yellow-600',
  [PlanTier.CREATOR_PREMIUM]: 'bg-blue-700 text-blue-200 border-blue-600',
};

export const ROLE_TYPE_BADGE_STYLES: Record<RoleType, string> = {
  [RoleType.ADMIN]: 'bg-red-700 text-red-200 border-red-600',
  [RoleType.MODERATOR]: 'bg-purple-700 text-purple-200 border-purple-600',
  [RoleType.TESTER]: 'bg-green-700 text-green-200 border-green-600',
};
```

#### Interface Definitions

```typescript
// client/src/types/userTypes.ts

/**
 * User plan tier record from database
 */
export interface UserPlanTier {
  id: string;
  user_id: string;
  plan_tier: PlanTier;
  is_active: boolean;
  started_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * User role record from database
 */
export interface UserRole {
  id: string;
  user_id: string;
  role_type: RoleType;
  granted_at: string;
  granted_by: string | null;
  revoked_at: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Combined user type information
 */
export interface UserTypeInfo {
  userId: string;
  planTier: PlanTier;
  roles: RoleType[];
  isAdmin: boolean;
  displayTypes: string[]; // Array of display names for badges
}

/**
 * User type audit log entry
 */
export interface UserTypeAuditLog {
  id: string;
  target_user_id: string;
  modified_by: string;
  action_type: 'plan_tier_assigned' | 'plan_tier_changed' | 'role_granted' | 'role_revoked';
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Extended user profile with type information
 */
export interface UserProfileWithTypes {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
  updated_at: string | null;
  user_type: string | null; // Deprecated field
  planTier: PlanTier;
  roles: RoleType[];
  isAdmin: boolean;
}
```

### Database Type Updates

The existing `database.ts` types will be updated to include the new tables:

```typescript
// client/src/types/database.ts (additions)

export type Database = {
  public: {
    Tables: {
      // ... existing tables ...
      
      user_plan_tiers: {
        Row: {
          id: string;
          user_id: string;
          plan_tier: string;
          is_active: boolean;
          started_at: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_tier: string;
          is_active?: boolean;
          started_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_tier?: string;
          is_active?: boolean;
          started_at?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_type: string;
          granted_at: string;
          granted_by: string | null;
          revoked_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_type: string;
          granted_at?: string;
          granted_by?: string | null;
          revoked_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_type?: string;
          granted_at?: string;
          granted_by?: string | null;
          revoked_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      
      user_type_audit_log: {
        Row: {
          id: string;
          target_user_id: string;
          modified_by: string;
          action_type: string;
          old_value: string | null;
          new_value: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_user_id: string;
          modified_by: string;
          action_type: string;
          old_value?: string | null;
          new_value?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          target_user_id?: string;
          modified_by?: string;
          action_type?: string;
          old_value?: string | null;
          new_value?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      // ... existing functions ...
      
      get_user_plan_tier: {
        Args: { p_user_id: string };
        Returns: string;
      };
      get_user_roles: {
        Args: { p_user_id: string };
        Returns: string[];
      };
      get_user_all_types: {
        Args: { p_user_id: string };
        Returns: {
          plan_tier: string;
          roles: string[];
          all_types: string[];
        }[];
      };
      assign_plan_tier: {
        Args: {
          p_target_user_id: string;
          p_new_plan_tier: string;
          p_admin_user_id?: string;
        };
        Returns: boolean;
      };
      grant_user_role: {
        Args: {
          p_target_user_id: string;
          p_role_type: string;
          p_admin_user_id?: string;
        };
        Returns: boolean;
      };
      revoke_user_role: {
        Args: {
          p_target_user_id: string;
          p_role_type: string;
          p_admin_user_id?: string;
        };
        Returns: boolean;
      };
      is_user_admin: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
    };
  };
};
```



## Error Handling

### Error Types

```typescript
// client/src/types/userTypes.ts

export class UserTypeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'UserTypeError';
  }
}

export const USER_TYPE_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_PLAN_TIER: 'INVALID_PLAN_TIER',
  INVALID_ROLE: 'INVALID_ROLE',
  ROLE_ALREADY_EXISTS: 'ROLE_ALREADY_EXISTS',
  CANNOT_REVOKE_OWN_ADMIN: 'CANNOT_REVOKE_OWN_ADMIN',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NOT_FOUND: 'NOT_FOUND',
} as const;
```

### Error Handling Strategy

1. **Database Errors**: Catch and log all database errors, return user-friendly messages
2. **Authorization Errors**: Return 403 Forbidden with clear error message
3. **Validation Errors**: Return 400 Bad Request with specific validation failures
4. **Not Found Errors**: Return 404 Not Found when user or type doesn't exist
5. **Audit Logging**: Log all errors related to user type modifications

## Testing Strategy

### Unit Tests

1. **Utility Functions**
   - Test `getUserTypeInfo()` with various user configurations
   - Test `hasRole()` and `hasPlanTier()` helper functions
   - Test badge style selection logic
   - Test display name formatting

2. **Database Functions**
   - Test `get_user_plan_tier()` with active and inactive tiers
   - Test `get_user_roles()` with multiple roles
   - Test `assign_plan_tier()` with valid and invalid inputs
   - Test `grant_user_role()` and `revoke_user_role()` authorization
   - Test `is_user_admin()` with various user states

3. **RLS Policies**
   - Test users can only view their own data
   - Test admins can view all data
   - Test non-admins cannot modify user types
   - Test admins can modify user types

### Integration Tests

1. **Authentication Flow**
   - Test user login loads correct plan tier and roles
   - Test AuthContext provides accurate user type information
   - Test session persistence includes user types

2. **Badge Display**
   - Test profile page displays correct badges
   - Test account page displays correct plan information
   - Test badges update when user types change

3. **Admin Operations**
   - Test admin can assign plan tiers
   - Test admin can grant/revoke roles
   - Test non-admin cannot perform admin operations
   - Test audit log records all modifications

### End-to-End Tests

1. **User Journey - Free User**
   - Register new account → Verify assigned Free User tier
   - View own profile → Verify Free User badge displayed
   - View account page → Verify plan information shown

2. **User Journey - Admin Operations**
   - Admin logs in → Verify admin role loaded
   - Admin changes user plan tier → Verify change reflected
   - Admin grants moderator role → Verify role added
   - View audit log → Verify all actions logged

3. **Security Testing**
   - Attempt to modify user types without admin role → Verify blocked
   - Attempt to view other users' data without admin role → Verify blocked
   - Attempt SQL injection in user type fields → Verify sanitized
   - Attempt privilege escalation → Verify prevented

### Manual Testing Checklist

After automated tests pass, perform manual validation:

- [ ] Profile page displays correct badges for all user type combinations
- [ ] Account page shows accurate plan tier and description
- [ ] "Change Plan" button is visible (placeholder functionality)
- [ ] Badge colors match design specifications
- [ ] Multiple badges display correctly (e.g., Creator Pro + Moderator + Tester)
- [ ] Admin badge displays for admin users
- [ ] Badges are responsive on mobile devices
- [ ] Loading states display correctly
- [ ] Error states display user-friendly messages



## UI/UX Design

### Badge Component Design

The `UserTypeBadge` component will be enhanced to support the new system:

```typescript
// client/src/components/profile/UserTypeBadge.tsx

interface UserTypeBadgeProps {
  planTier: PlanTier;
  roles?: RoleType[];
  size?: 'sm' | 'md' | 'lg';
  showPlanTier?: boolean;
  showRoles?: boolean;
}

/**
 * Displays user type badges with plan tier and optional roles
 * 
 * Features:
 * - Color-coded badges based on type
 * - Responsive sizing
 * - Accessible with ARIA labels
 * - Supports showing/hiding plan tier or roles independently
 */
export default function UserTypeBadge({
  planTier,
  roles = [],
  size = 'md',
  showPlanTier = true,
  showRoles = true,
}: UserTypeBadgeProps) {
  // Implementation details in tasks
}
```

### Profile Page Updates

Location: `client/src/app/profile/[username]/page.tsx`

**Changes:**
1. Fetch user type information from new tables
2. Pass plan tier and roles to `UserTypeBadge` component
3. Display all applicable badges (plan tier + roles)
4. Handle loading and error states

**Visual Layout:**
```
┌─────────────────────────────────────────────────┐
│  [Creator Premium] [Moderator] [Tester]         │  ← Badges
├─────────────────────────────────────────────────┤
│  Profile Header (username, avatar, follow btn)  │
├─────────────────────────────────────────────────┤
│  Stats Section                                  │
├─────────────────────────────────────────────────┤
│  Tracks, Albums, Playlists                      │
└─────────────────────────────────────────────────┘
```

### Account Page Updates

Location: `client/src/app/account/page.tsx`

**New Section: Plan Information**

```
┌─────────────────────────────────────────────────┐
│  Your Account                                   │
├─────────────────────────────────────────────────┤
│  Account Information                            │
│  - Email (read-only)                            │
│  - Account Status                               │
├─────────────────────────────────────────────────┤
│  Plan & Subscription                            │  ← NEW SECTION
│                                                 │
│  Current Plan: Creator Premium                  │
│  [Creator Premium] [Moderator] [Tester]         │
│                                                 │
│  Full platform access with unlimited uploads,   │
│  premium analytics, collaboration tools, and    │
│  dedicated support.                             │
│                                                 │
│  [Change Plan →]                                │  ← Placeholder button
├─────────────────────────────────────────────────┤
│  Community Stats                                │
├─────────────────────────────────────────────────┤
│  Profile Information                            │
│  - Username                                     │
│  - Member since                                 │
└─────────────────────────────────────────────────┘
```

**Component Structure:**

```typescript
// New component: PlanInformationSection
interface PlanInformationSectionProps {
  planTier: PlanTier;
  roles: RoleType[];
  onChangePlan: () => void; // Placeholder for future functionality
}
```

### Responsive Design

**Mobile (< 768px):**
- Badges stack vertically or wrap to multiple lines
- Plan description text remains readable
- "Change Plan" button full width

**Tablet (768px - 1024px):**
- Badges display in a single row with wrapping
- Plan description in 2-column layout if space allows

**Desktop (> 1024px):**
- Badges display in a single row
- Plan description in full width
- Optimal spacing and padding

### Accessibility

1. **ARIA Labels**: All badges have descriptive aria-labels
2. **Keyboard Navigation**: "Change Plan" button is keyboard accessible
3. **Screen Readers**: Plan tier and roles announced correctly
4. **Color Contrast**: All badge colors meet WCAG AA standards
5. **Focus Indicators**: Clear focus states for interactive elements

## Migration Strategy

### Phase 1: Database Setup (No User Impact)

1. Create new tables (`user_plan_tiers`, `user_roles`, `user_type_audit_log`)
2. Create database functions
3. Implement RLS policies
4. Create indexes for performance

### Phase 2: Data Migration

1. **Migrate Existing Users**
   - Read `user_type` from `user_profiles`
   - Map to new plan tier system:
     - `'Free User'` → `free_user` plan tier
     - Any other value → `free_user` plan tier (default)
   - Create `user_plan_tiers` record for each user
   - Mark migration complete in metadata

2. **Migration Script**

```sql
-- Migration script to populate user_plan_tiers from existing user_type
INSERT INTO user_plan_tiers (user_id, plan_tier, is_active)
SELECT 
  user_id,
  CASE 
    WHEN LOWER(user_type) LIKE '%premium%' THEN 'creator_premium'
    WHEN LOWER(user_type) LIKE '%pro%' THEN 'creator_pro'
    ELSE 'free_user'
  END as plan_tier,
  true as is_active
FROM user_profiles
WHERE user_id NOT IN (
  SELECT user_id FROM user_plan_tiers WHERE is_active = true
);
```

3. **Assign Initial Admin**
   - Manually grant admin role to platform owner
   - Use direct database insert or Supabase dashboard

```sql
-- Grant admin role to initial admin user
INSERT INTO user_roles (user_id, role_type, is_active)
VALUES ('[ADMIN_USER_ID]', 'admin', true);
```

### Phase 3: Application Updates

1. Update TypeScript types
2. Create utility functions
3. Update AuthContext to load user types
4. Update UI components (badges, profile page, account page)
5. Add error handling and loading states

### Phase 4: Testing & Validation

1. Run automated test suite
2. Perform manual testing
3. Verify RLS policies work correctly
4. Test admin operations
5. Validate audit logging

### Phase 5: Deployment

1. Deploy database changes to production
2. Run migration script
3. Deploy application updates
4. Monitor for errors
5. Verify user experience

### Phase 6: Deprecation (Future)

After confirming the new system works correctly:
1. Mark `user_profiles.user_type` column as deprecated (already done in design)
2. Update documentation
3. Plan for eventual column removal (6+ months after deployment)

## Security Considerations

### Authentication & Authorization

1. **Server-Side Validation**: All user type checks performed server-side
2. **RLS Enforcement**: Database-level security prevents unauthorized access
3. **Admin Verification**: Every admin operation verifies caller has admin role
4. **Session Security**: User type information included in secure session data
5. **Audit Trail**: All modifications logged with timestamp and modifier

### Privilege Escalation Prevention

1. **Database Constraints**: CHECK constraints prevent invalid values
2. **Function Security**: SECURITY DEFINER functions validate permissions
3. **Self-Modification Prevention**: Users cannot grant themselves admin role
4. **Admin Protection**: Admins cannot revoke their own admin role
5. **Unique Constraints**: Prevent duplicate active roles/tiers

### Input Validation

1. **Plan Tier Validation**: Only allow predefined plan tier values
2. **Role Type Validation**: Only allow predefined role types
3. **SQL Injection Prevention**: Use parameterized queries
4. **XSS Prevention**: Sanitize all user type display values
5. **Type Safety**: TypeScript enums enforce valid values

### Data Protection

1. **RLS Policies**: Users can only view their own data (except admins)
2. **Audit Logging**: Track all user type modifications
3. **Secure Functions**: Database functions use SECURITY DEFINER appropriately
4. **Encrypted Storage**: Leverage Supabase's encryption at rest
5. **Secure Transmission**: All API calls over HTTPS

### Security Audit Plan

After implementation, perform comprehensive security audit:

1. **Penetration Testing**
   - Attempt privilege escalation attacks
   - Test authorization bypass techniques
   - Verify RLS policy effectiveness
   - Test SQL injection vulnerabilities

2. **Code Review**
   - Review all database functions for security issues
   - Verify RLS policies cover all scenarios
   - Check for authorization bypass opportunities
   - Validate input sanitization

3. **Access Control Testing**
   - Verify non-admins cannot access admin functions
   - Test that users can only view their own data
   - Confirm audit logs are protected
   - Validate session security

4. **Remediation**
   - Document all findings
   - Prioritize by severity (Critical, High, Medium, Low)
   - Create remediation plan with timelines
   - Fix all Critical and High severity issues before production
   - Schedule Medium and Low severity fixes

## Performance Considerations

### Database Optimization

1. **Indexes**: Created on frequently queried columns
   - `user_plan_tiers(user_id, is_active)`
   - `user_roles(user_id, is_active)`
   - `user_roles(role_type, is_active)`

2. **Query Optimization**
   - Use database functions for complex queries
   - Minimize joins in RLS policies
   - Cache user type information in application layer

3. **Connection Pooling**: Leverage Supabase's connection pooling

### Application Performance

1. **Caching Strategy**
   - Cache user type information in AuthContext
   - Invalidate cache on user type changes
   - Use React Context to avoid prop drilling

2. **Lazy Loading**
   - Load user type information only when needed
   - Defer non-critical user type queries

3. **Batch Operations**
   - Batch user type queries when loading multiple users
   - Use single query to fetch plan tier and roles together

### Monitoring

1. **Performance Metrics**
   - Track database query execution times
   - Monitor RLS policy overhead
   - Measure badge rendering performance

2. **Error Tracking**
   - Log all user type errors
   - Monitor failed authorization attempts
   - Track audit log growth

## Future Enhancements

This design provides foundation for future features:

1. **Plan Tier Selection at Registration**
   - UI for choosing plan during signup
   - Payment integration for paid tiers
   - Trial period management

2. **Plan Upgrade/Downgrade**
   - Self-service plan changes
   - Prorated billing
   - Feature access transitions

3. **Admin Dashboard**
   - User management interface
   - Bulk user type operations
   - Audit log viewer
   - Analytics and reporting

4. **Moderator Tools**
   - Content moderation interface
   - User report management
   - Moderation action logging

5. **Tester Features**
   - Beta feature access
   - Feedback submission tools
   - Bug reporting interface

6. **Role-Based Feature Flags**
   - Conditional feature rendering based on roles
   - A/B testing for specific user types
   - Gradual feature rollouts

## Conclusion

This design provides a robust, secure, and scalable foundation for the user types and plan tiers system. The architecture supports flexible role combinations, maintains backward compatibility, and prepares the platform for future monetization and administrative features.

Key strengths:
- **Security-first approach** with database-level RLS and comprehensive audit logging
- **Flexible architecture** supporting multiple roles per user
- **Type-safe implementation** with comprehensive TypeScript definitions
- **Scalable design** ready for future features
- **Smooth migration path** from existing system

The implementation will be executed in phases to minimize risk and ensure thorough testing at each stage.
