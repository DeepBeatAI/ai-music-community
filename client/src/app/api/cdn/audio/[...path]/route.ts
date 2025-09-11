import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const audioPath = params.path.join('/');
    
    // Basic validation
    if (!audioPath || audioPath.length === 0) {
      return NextResponse.json({ error: 'Invalid audio path' }, { status: 400 });
    }

    // Security check - only allow specific file types
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.webm', '.ogg'];
    const hasValidExtension = allowedExtensions.some(ext => 
      audioPath.toLowerCase().endsWith(ext)
    );
    
    if (!hasValidExtension) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    
    // Get signed URL from Supabase with 1 hour cache
    const { data, error } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(audioPath, 3600);
    
    if (error || !data?.signedUrl) {
      console.error('Supabase storage error:', error);
      return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
    }

    // Fetch audio from Supabase
    const audioResponse = await fetch(data.signedUrl);
    
    if (!audioResponse.ok) {
      console.error('Failed to fetch audio from Supabase:', audioResponse.status);
      return NextResponse.json({ error: 'Failed to fetch audio' }, { status: 500 });
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const contentType = audioResponse.headers.get('Content-Type') || 'audio/mpeg';
    
    // Return with aggressive caching headers for CDN optimization
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
        'CDN-Cache-Control': 'public, max-age=31536000',
        'Vary': 'Accept-Encoding',
        'X-CDN-Cache': 'MISS',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Range',
        'Accept-Ranges': 'bytes'
      }
    });

  } catch (error) {
    console.error('CDN proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Range',
    },
  });
}

// Support HEAD requests for metadata
export async function HEAD(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const audioPath = params.path.join('/');
    
    // Get signed URL from Supabase
    const { data, error } = await supabase.storage
      .from('audio-files')
      .createSignedUrl(audioPath, 3600);
    
    if (error || !data?.signedUrl) {
      return new NextResponse(null, { status: 404 });
    }

    // Get just the headers without downloading the full file
    const headResponse = await fetch(data.signedUrl, { method: 'HEAD' });
    
    if (!headResponse.ok) {
      return new NextResponse(null, { status: 404 });
    }

    const contentLength = headResponse.headers.get('Content-Length') || '0';
    const contentType = headResponse.headers.get('Content-Type') || 'audio/mpeg';
    
    return new NextResponse(null, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes'
      }
    });

  } catch (error) {
    console.error('CDN HEAD request error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
