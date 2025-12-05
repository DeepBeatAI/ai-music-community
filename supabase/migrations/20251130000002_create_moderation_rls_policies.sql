-- =====================================================
-- Moderation System RLS Policies Migration
-- =====================================================
-- This migration creates Row Level Security policies for
-- moderation_reports, moderation_actions, and user_restrictions
-- tables.
--
-- Requirements: 11.2, 11.3
-- =====================================================

-- =====================================================
-- 1. RLS Policies for moderation_reports
-- =====================================================
-- Requirements: 11.2, 11.3

-- Enable RLS on moderation_reports table
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON public.moderation_reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- Policy: Users can view reports about themselves
CREATE POLICY "Users can view reports about themselves"
  ON public.moderation_reports
  FOR SELECT
  USING (auth.uid() = reported_user_id);

-- Policy: Moderators and admins can view all reports
CREATE POLICY "Moderators and admins can view all reports"
  ON public.moderation_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type IN ('moderator', 'admin')
        AND user_roles.is_active = true
    )
  );

-- Policy: Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
  ON public.moderation_reports
  FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
    AND auth.uid() IS NOT NULL
  );

-- Policy: Moderators and admins can update reports
CREATE POLICY "Moderators and admins can update reports"
  ON public.moderation_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type IN ('moderator', 'admin')
        AND user_roles.is_active = true
    )
  );

-- Policy: Prevent deletion of reports (immutable for audit trail)
CREATE POLICY "Prevent deletion of reports"
  ON public.moderation_reports
  FOR DELETE
  USING (false);

-- Add table comment documenting RLS policies
COMMENT ON TABLE public.moderation_reports IS 
  'Stores user reports and moderator flags for content and user violations.
   Reports can be submitted by users or created directly by moderators.
   Priority is automatically calculated based on reason, with moderator flags
   receiving higher priority.
   
   RLS Policies:
   - Users can view their own reports
   - Users can view reports about themselves
   - Moderators and admins can view all reports
   - Authenticated users can create reports
   - Moderators and admins can update reports
   - Reports cannot be deleted (immutable for audit trail)';

-- =====================================================
-- 2. RLS Policies for moderation_actions
-- =====================================================
-- Requirements: 11.2, 11.3

-- Enable RLS on moderation_actions table
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view actions taken on their account
CREATE POLICY "Users can view actions on their account"
  ON public.moderation_actions
  FOR SELECT
  USING (auth.uid() = target_user_id);

-- Policy: Moderators and admins can view all actions
CREATE POLICY "Moderators and admins can view all actions"
  ON public.moderation_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type IN ('moderator', 'admin')
        AND user_roles.is_active = true
    )
  );

-- Policy: Moderators and admins can create actions
CREATE POLICY "Moderators and admins can create actions"
  ON public.moderation_actions
  FOR INSERT
  WITH CHECK (
    auth.uid() = moderator_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type IN ('moderator', 'admin')
        AND user_roles.is_active = true
    )
  );

-- Policy: Only admins can update actions (for revocation)
CREATE POLICY "Only admins can update actions"
  ON public.moderation_actions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type = 'admin'
        AND user_roles.is_active = true
    )
  );

-- Policy: Prevent deletion of actions (immutable for audit trail)
CREATE POLICY "Prevent deletion of actions"
  ON public.moderation_actions
  FOR DELETE
  USING (false);

-- Add table comment documenting RLS policies
COMMENT ON TABLE public.moderation_actions IS 
  'Comprehensive audit log of all moderation actions taken by moderators and admins.
   Tracks content removals, user warnings, suspensions, bans, and restrictions.
   This table is append-only and protected from modification to ensure audit integrity.
   
   RLS Policies:
   - Users can view actions taken on their account
   - Moderators and admins can view all actions
   - Moderators and admins can create actions
   - Only admins can update actions (for revocation)
   - Actions cannot be deleted (immutable for audit trail)';

-- =====================================================
-- 3. RLS Policies for user_restrictions
-- =====================================================
-- Requirements: 11.2, 11.3

-- Enable RLS on user_restrictions table
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own restrictions
CREATE POLICY "Users can view own restrictions"
  ON public.user_restrictions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Moderators and admins can view all restrictions
CREATE POLICY "Moderators and admins can view all restrictions"
  ON public.user_restrictions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type IN ('moderator', 'admin')
        AND user_roles.is_active = true
    )
  );

-- Policy: Moderators and admins can create restrictions
CREATE POLICY "Moderators and admins can create restrictions"
  ON public.user_restrictions
  FOR INSERT
  WITH CHECK (
    auth.uid() = applied_by
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type IN ('moderator', 'admin')
        AND user_roles.is_active = true
    )
  );

-- Policy: Moderators and admins can update restrictions
CREATE POLICY "Moderators and admins can update restrictions"
  ON public.user_restrictions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role_type IN ('moderator', 'admin')
        AND user_roles.is_active = true
    )
  );

-- Policy: Users cannot modify their own restrictions
-- This is enforced by the above policies (only moderators/admins can update)
-- Adding explicit comment for clarity

-- Policy: Prevent deletion of restrictions (use is_active flag instead)
CREATE POLICY "Prevent deletion of restrictions"
  ON public.user_restrictions
  FOR DELETE
  USING (false);

-- Add table comment documenting RLS policies
COMMENT ON TABLE public.user_restrictions IS 
  'Stores fine-grained user restrictions for specific capabilities.
   Each user can have multiple active restrictions simultaneously.
   Restrictions can be time-based (with expiration) or permanent (NULL expires_at).
   
   RLS Policies:
   - Users can view their own restrictions
   - Moderators and admins can view all restrictions
   - Moderators and admins can create restrictions
   - Moderators and admins can update restrictions
   - Users cannot modify their own restrictions
   - Restrictions cannot be deleted (use is_active flag instead)';

-- =====================================================
-- 4. Additional Security Constraints
-- =====================================================
-- Prevent moderators from taking actions on admin accounts
-- This is enforced at the application level, but we add a comment for clarity

COMMENT ON COLUMN public.moderation_actions.target_user_id IS 
  'UUID of the user affected by the action.
   
   Security Note: Application logic must prevent moderators from taking
   actions on admin accounts. This is enforced in the moderation service layer.';

COMMENT ON COLUMN public.user_restrictions.user_id IS 
  'UUID of the user being restricted.
   
   Security Note: Application logic must prevent moderators from restricting
   admin accounts. This is enforced in the moderation service layer.';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Enabled RLS on moderation_reports table
-- ✓ Created policies for users to view own reports
-- ✓ Created policies for users to view reports about themselves
-- ✓ Created policies for moderators/admins to view all reports
-- ✓ Created policies for authenticated users to create reports
-- ✓ Created policies for moderators/admins to update reports
-- ✓ Prevented deletion of reports (immutable)
--
-- ✓ Enabled RLS on moderation_actions table
-- ✓ Created policies for users to view actions on their account
-- ✓ Created policies for moderators/admins to view all actions
-- ✓ Created policies for moderators/admins to create actions
-- ✓ Created policies for admins to update actions (revocation)
-- ✓ Prevented deletion of actions (immutable)
--
-- ✓ Enabled RLS on user_restrictions table
-- ✓ Created policies for users to view own restrictions
-- ✓ Created policies for moderators/admins to view all restrictions
-- ✓ Created policies for moderators/admins to create restrictions
-- ✓ Created policies for moderators/admins to update restrictions
-- ✓ Prevented deletion of restrictions
--
-- All moderation tables now have comprehensive RLS protection
-- Security is enforced at the database level
-- Additional application-level checks required for moderator vs admin actions
-- =====================================================
