import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Try multiple methods to get IP address
  
  // Method 1: Check various proxy headers (Vercel, Cloudflare, etc.)
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  // Method 2: Try to get from request.ip (Next.js 13+)
  const requestIp = (request as any).ip;
  
  // Method 3: Try to get from socket (if available)
  const socketIp = (request as any).socket?.remoteAddress;
  
  // Priority order: Cloudflare > Forwarded > Real-IP > Request.ip > Socket > Localhost fallback
  let ip = cfConnectingIp 
    || forwarded?.split(',')[0]?.trim() 
    || realIp 
    || requestIp 
    || socketIp 
    || '127.0.0.1'; // Use localhost as fallback instead of "Unknown"
  
  // Clean up IPv6 localhost to IPv4
  if (ip === '::1') {
    ip = '127.0.0.1';
  }
  
  return NextResponse.json({ ip });
}
