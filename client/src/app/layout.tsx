'use client';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminProvider } from '@/contexts/AdminContext';
import { FollowProvider } from '@/contexts/FollowContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { PlaybackProvider } from '@/contexts/PlaybackContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MiniPlayer } from '@/components/playlists/MiniPlayer';
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
        className={`${geistSans.variable} antialiased pb-24 md:pb-20`}
      >
        <ErrorBoundary>
          <AuthProvider>
            <AdminProvider>
              <FollowProvider>
                <ToastProvider>
                  <PlaybackProvider>
                    {children}
                    {/* Mini Player - persistent audio player across all pages */}
                    <MiniPlayer />
                  </PlaybackProvider>
                </ToastProvider>
              </FollowProvider>
            </AdminProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}