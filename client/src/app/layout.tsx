import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { FollowProvider } from '@/contexts/FollowContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import CacheTestDashboard from '@/components/CacheTestDashboard';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Music Community",
  description: "Create, Share, Connect, and Grow Your AI Music",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <AuthProvider>
            <FollowProvider>
              {children}
              {/* Only show in development */}
              {process.env.NODE_ENV === 'development' && (
                <CacheTestDashboard />
              )}
            </FollowProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}