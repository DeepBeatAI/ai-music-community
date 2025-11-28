-- =====================================================
-- Seed Platform Configuration Data
-- =====================================================
-- This migration seeds initial platform configuration
-- including feature flags, upload limits, rate limits,
-- and email templates.
--
-- This is OPTIONAL and can be customized based on your needs.
-- =====================================================

-- =====================================================
-- 1. Feature Flags
-- =====================================================

INSERT INTO public.platform_config (config_key, config_value, config_type, description, is_active)
VALUES 
  (
    'ai_music_generation_enabled',
    '{"enabled": true}'::jsonb,
    'feature_flag',
    'Enable AI music generation features',
    true
  ),
  (
    'beta_features_enabled',
    '{"enabled": false}'::jsonb,
    'feature_flag',
    'Enable beta features for testing',
    true
  ),
  (
    'maintenance_mode',
    '{"enabled": false}'::jsonb,
    'feature_flag',
    'Put site in maintenance mode',
    true
  ),
  (
    'social_sharing_enabled',
    '{"enabled": true}'::jsonb,
    'feature_flag',
    'Enable social media sharing features',
    true
  ),
  (
    'comments_enabled',
    '{"enabled": true}'::jsonb,
    'feature_flag',
    'Enable comments on tracks and posts',
    true
  )
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- 2. Upload Limits by Plan Tier
-- =====================================================

INSERT INTO public.platform_config (config_key, config_value, config_type, description, is_active)
VALUES 
  (
    'upload_limits_free_user',
    '{
      "max_file_size_mb": 50,
      "max_uploads_per_day": 5,
      "max_total_storage_gb": 1,
      "allowed_formats": ["mp3", "wav", "flac"]
    }'::jsonb,
    'upload_limit',
    'Upload limits for free users',
    true
  ),
  (
    'upload_limits_creator_pro',
    '{
      "max_file_size_mb": 200,
      "max_uploads_per_day": 50,
      "max_total_storage_gb": 10,
      "allowed_formats": ["mp3", "wav", "flac", "aiff", "ogg"]
    }'::jsonb,
    'upload_limit',
    'Upload limits for Creator Pro users',
    true
  ),
  (
    'upload_limits_creator_premium',
    '{
      "max_file_size_mb": 500,
      "max_uploads_per_day": -1,
      "max_total_storage_gb": 100,
      "allowed_formats": ["mp3", "wav", "flac", "aiff", "ogg", "alac"]
    }'::jsonb,
    'upload_limit',
    'Upload limits for Creator Premium users (-1 = unlimited)',
    true
  )
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- 3. Rate Limits
-- =====================================================

INSERT INTO public.platform_config (config_key, config_value, config_type, description, is_active)
VALUES 
  (
    'rate_limit_api_requests',
    '{
      "requests_per_minute": 60,
      "requests_per_hour": 1000,
      "requests_per_day": 10000
    }'::jsonb,
    'rate_limit',
    'General API rate limits for authenticated users',
    true
  ),
  (
    'rate_limit_uploads',
    '{
      "uploads_per_hour": 10,
      "uploads_per_day": 50
    }'::jsonb,
    'rate_limit',
    'Upload rate limits to prevent abuse',
    true
  ),
  (
    'rate_limit_comments',
    '{
      "comments_per_minute": 5,
      "comments_per_hour": 100,
      "comments_per_day": 500
    }'::jsonb,
    'rate_limit',
    'Comment rate limits to prevent spam',
    true
  ),
  (
    'rate_limit_likes',
    '{
      "likes_per_minute": 20,
      "likes_per_hour": 500
    }'::jsonb,
    'rate_limit',
    'Like/favorite rate limits',
    true
  ),
  (
    'rate_limit_follows',
    '{
      "follows_per_hour": 50,
      "follows_per_day": 200
    }'::jsonb,
    'rate_limit',
    'Follow/unfollow rate limits',
    true
  )
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- 4. Email Templates
-- =====================================================

INSERT INTO public.platform_config (config_key, config_value, config_type, description, is_active)
VALUES 
  (
    'email_welcome',
    '{
      "subject": "Welcome to AI Music Platform! 🎵",
      "body": "Hi {{username}},\n\nWelcome to our AI Music community! We''re excited to have you here.\n\nGet started by:\n- Uploading your first track\n- Exploring music from other creators\n- Connecting with fellow musicians\n\nIf you have any questions, feel free to reach out to our support team.\n\nHappy creating!\nThe AI Music Platform Team"
    }'::jsonb,
    'email_template',
    'Welcome email sent to new users',
    true
  ),
  (
    'email_password_reset',
    '{
      "subject": "Reset Your Password",
      "body": "Hi {{username}},\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n{{reset_link}}\n\nThis link will expire in 24 hours.\n\nIf you didn''t request this, you can safely ignore this email.\n\nBest regards,\nThe AI Music Platform Team"
    }'::jsonb,
    'email_template',
    'Password reset email template',
    true
  ),
  (
    'email_verification',
    '{
      "subject": "Verify Your Email Address",
      "body": "Hi {{username}},\n\nPlease verify your email address by clicking the link below:\n\n{{verification_link}}\n\nThis link will expire in 24 hours.\n\nIf you didn''t create an account, you can safely ignore this email.\n\nBest regards,\nThe AI Music Platform Team"
    }'::jsonb,
    'email_template',
    'Email verification template',
    true
  ),
  (
    'email_track_comment',
    '{
      "subject": "New Comment on Your Track: {{track_title}}",
      "body": "Hi {{username}},\n\n{{commenter_username}} commented on your track \"{{track_title}}\":\n\n\"{{comment_text}}\"\n\nView and reply: {{track_link}}\n\nBest regards,\nThe AI Music Platform Team"
    }'::jsonb,
    'email_template',
    'Notification email for new comments on tracks',
    true
  ),
  (
    'email_new_follower',
    '{
      "subject": "{{follower_username}} is now following you!",
      "body": "Hi {{username}},\n\n{{follower_username}} started following you on AI Music Platform!\n\nCheck out their profile: {{follower_profile_link}}\n\nBest regards,\nThe AI Music Platform Team"
    }'::jsonb,
    'email_template',
    'Notification email for new followers',
    true
  )
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- 5. System Settings
-- =====================================================

INSERT INTO public.platform_config (config_key, config_value, config_type, description, is_active)
VALUES 
  (
    'system_notification_email',
    '{
      "email": "admin@aimusicplatform.com",
      "name": "AI Music Platform Admin"
    }'::jsonb,
    'system_setting',
    'Email address for system notifications and alerts',
    true
  ),
  (
    'system_support_email',
    '{
      "email": "support@aimusicplatform.com",
      "name": "AI Music Platform Support"
    }'::jsonb,
    'system_setting',
    'Email address for user support inquiries',
    true
  ),
  (
    'system_max_session_duration_hours',
    '{"hours": 168}'::jsonb,
    'system_setting',
    'Maximum session duration in hours (168 = 7 days)',
    true
  ),
  (
    'system_password_min_length',
    '{"min_length": 8}'::jsonb,
    'system_setting',
    'Minimum password length requirement',
    true
  )
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- ✓ Seeded 5 feature flags
-- ✓ Seeded 3 upload limit configurations (one per plan tier)
-- ✓ Seeded 5 rate limit configurations
-- ✓ Seeded 5 email templates
-- ✓ Seeded 4 system settings
--
-- Total: 22 configuration entries
--
-- Note: All inserts use ON CONFLICT DO NOTHING to allow
-- safe re-running of this migration without duplicates.
-- =====================================================
