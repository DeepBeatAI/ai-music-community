import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple Test API Route
 * 
 * Basic test to see if API routes work at all
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    
    console.log(`🧪 Test API: Page ${page}, Limit ${limit}`);
    
    // Return simple test response
    return NextResponse.json({
      success: true,
      message: 'Test API working',
      page,
      limit,
      timestamp: new Date().toISOString(),
      posts: [], // Empty for now
      hasMore: false,
    }, {
      status: 200,
    });

  } catch (error) {
    console.error('❌ Test API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Test API failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}