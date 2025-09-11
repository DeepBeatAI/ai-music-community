'use client';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { FollowProvider } from '@/contexts/FollowContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import CacheTestDashboard from '@/components/CacheTestDashboard';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import { useState } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>AI Music Community</title>
        <meta name="description" content="Create, Share, Connect, and Grow Your AI Music" />
      </head>
      <body
        className={`${geistSans.variable} antialiased`}
      >
        <ErrorBoundary>
          <AuthProvider>
            <FollowProvider>
              {children}
              {/* Only show in development */}
              {process.env.NODE_ENV === 'development' && (
                <>
                  <CacheTestDashboard />
                  <PerformanceDashboard
                    isVisible={showDashboard}
                    onToggle={() => setShowDashboard(!showDashboard)}
                  />
                </>
              )}
            </FollowProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}