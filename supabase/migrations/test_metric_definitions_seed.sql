-- Test Script: Validate Metric Definitions Seed Data
-- Purpose: Verify that metric definitions are properly inserted

-- Query all metric definitions
SELECT 
  metric_type,
  metric_category,
  display_name,
  description,
  unit,
  format_pattern,
  is_active
FROM metric_definitions
ORDER BY metric_category;

-- Verify count of definitions (should be 5)
SELECT COUNT(*) as total_definitions FROM metric_definitions;

-- Verify each specific metric exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM metric_definitions WHERE metric_category = 'users_total') 
    THEN '✓ users_total exists'
    ELSE '✗ users_total missing'
  END as users_total_check,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM metric_definitions WHERE metric_category = 'posts_total') 
    THEN '✓ posts_total exists'
    ELSE '✗ posts_total missing'
  END as posts_total_check,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM metric_definitions WHERE metric_category = 'comments_total') 
    THEN '✓ comments_total exists'
    ELSE '✗ comments_total missing'
  END as comments_total_check,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM metric_definitions WHERE metric_category = 'posts_created') 
    THEN '✓ posts_created exists'
    ELSE '✗ posts_created missing'
  END as posts_created_check,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM metric_definitions WHERE metric_category = 'comments_created') 
    THEN '✓ comments_created exists'
    ELSE '✗ comments_created missing'
  END as comments_created_check;

-- Verify all metrics have proper format patterns
SELECT 
  metric_category,
  format_pattern,
  CASE 
    WHEN format_pattern = '0,0' THEN '✓ Valid format'
    ELSE '✗ Invalid format'
  END as format_validation
FROM metric_definitions;

-- Verify all metrics are active
SELECT 
  metric_category,
  is_active,
  CASE 
    WHEN is_active = true THEN '✓ Active'
    ELSE '✗ Inactive'
  END as active_status
FROM metric_definitions;
