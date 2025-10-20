'use client';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { FollowProvider } from '@/contexts/FollowContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import CacheTestDashboard from '@/components/CacheTestDashboard';
import PerformanceDashboard from '@/components/performance/PerformanceDashboard';
import { useEffect } from 'react';
import { suppressExtensionErrors } from '@/utils/extensionErrorHandler';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize extension error suppression on mount
  useEffect(() => {
    suppressExtensionErrors();
  }, []);

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
              <ToastProvider>
                {children}
                {/* Performance Dashboard - always available */}
                <PerformanceDashboard />
                {/* Only show cache test dashboard in development */}
                {process.env.NODE_ENV === 'development' && (
                  <CacheTestDashboard />
                )}
              </ToastProvider>
            </FollowProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}