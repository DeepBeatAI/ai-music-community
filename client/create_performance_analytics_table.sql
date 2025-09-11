-- Migration: Create performance analytics table
-- Date: Month 3 Week 2 Implementation
-- Apply this manually in your Supabase SQL editor

-- Create performance analytics table for Month 3 Week 2
CREATE TABLE IF NOT EXISTS performance_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ NOT NULL,
  metrics JSONB NOT NULL,
  events JSONB NOT NULL,
  user_agent TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_performance_analytics_session ON performance_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_user ON performance_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_timestamp ON performance_analytics(timestamp);

-- Enable RLS
ALTER TABLE performance_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own performance data" ON performance_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance data" ON performance_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
