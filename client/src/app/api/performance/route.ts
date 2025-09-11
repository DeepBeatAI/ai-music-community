import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PerformanceData {
  sessionId: string;
  userId?: string;
  timestamp: number;
  metrics: {
    fcp: number;
    lcp: number;
    fid: number;
    cls: number;
    cacheHitRate: number;
    bandwidthSaved: number;
    errorRate: number;
  };
  events: Array<{
    type: string;
    timestamp: number;
    duration?: number;
    size?: number;
    metadata?: any;
  }>;
  userAgent: string;
  url: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: PerformanceData = await request.json();

    // Validate required fields
    if (!data.sessionId || !data.metrics || !data.events) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store in Supabase (create table if needed)
    const { error } = await supabase
      .from('performance_analytics')
      .insert([{
        session_id: data.sessionId,
        user_id: data.userId,
        timestamp: new Date(data.timestamp).toISOString(),
        metrics: data.metrics,
        events: data.events,
        user_agent: data.userAgent,
        url: data.url,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Failed to store performance data:', error);
      return NextResponse.json(
        { error: 'Failed to store data' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');
    const hours = parseInt(searchParams.get('hours') || '24');

    let query = supabase
      .from('performance_analytics')
      .select('*')
      .gte('timestamp', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      );
    }

    // Calculate aggregate metrics
    const aggregateMetrics = calculateAggregateMetrics(data || []);

    return NextResponse.json({
      data: data || [],
      aggregateMetrics,
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Performance GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateAggregateMetrics(data: any[]) {
  if (data.length === 0) {
    return {
      averageFCP: 0,
      averageLCP: 0,
      averageFID: 0,
      averageCLS: 0,
      overallCacheHitRate: 0,
      totalBandwidthSaved: 0,
      averageErrorRate: 0
    };
  }

  const metrics = data.map(d => d.metrics);

  return {
    averageFCP: metrics.reduce((sum, m) => sum + m.fcp, 0) / metrics.length,
    averageLCP: metrics.reduce((sum, m) => sum + m.lcp, 0) / metrics.length,
    averageFID: metrics.reduce((sum, m) => sum + m.fid, 0) / metrics.length,
    averageCLS: metrics.reduce((sum, m) => sum + m.cls, 0) / metrics.length,
    overallCacheHitRate: metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length,
    totalBandwidthSaved: metrics.reduce((sum, m) => sum + m.bandwidthSaved, 0),
    averageErrorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length
  };
}
