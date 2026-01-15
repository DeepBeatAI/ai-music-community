'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DiscoverTrendingSection } from './DiscoverTrendingSection';
import TrendingAlbumsSection from './TrendingAlbumsSection';
import TrendingPlaylistsSection from './TrendingPlaylistsSection';
import UserRecommendations from '@/components/UserRecommendations';
import { useAuth } from '@/contexts/AuthContext';
import { clearAnalyticsCache } from '@/lib/trendingAnalytics';
import { 
  TrendingAlbumsErrorBoundary, 
  TrendingPlaylistsErrorBoundary 
} from './DiscoverErrorBoundaries';

type TabType = 'tracks' | 'albums' | 'playlists' | 'creators';

interface DiscoverTabsProps {
  defaultTab?: TabType;
}

/**
 * DiscoverTabs Component
 * 
 * Main tab navigation component for the Discover page.
 * Provides four tabs: Tracks, Albums, Playlists, and Creators.
 * 
 * FEATURES:
 * - Tab navigation with active state styling
 * - Scroll position preservation per tab
 * - Responsive design for mobile and desktop
 * - Default Tracks tab selection
 * - Concurrent data loading with React Suspense
 * - Preloading of all tab content for fast switching
 * - Browser back button support (restores last viewed tab)
 * 
 * REQUIREMENTS:
 * - 7.1: Display four tabs (Tracks, Albums, Playlists, Creators)
 * - 7.2: Tracks tab active by default
 * - 7.3: Display corresponding content on tab click
 * - 7.4: Preserve scroll position per tab
 * - 7.5: Visual indication of active tab
 * - 7.6: Responsive design for mobile and desktop
 * - 12.4, 12.5: Concurrent data loading, tab switch within 1 second
 */
export function DiscoverTabs({ defaultTab = 'tracks' }: DiscoverTabsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial tab from URL query parameter or default
  const initialTab = (searchParams.get('tab') as TabType) || defaultTab;
  
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [scrollPositions, setScrollPositions] = useState<Record<TabType, number>>({
    tracks: 0,
    albums: 0,
    playlists: 0,
    creators: 0,
  });
  const [mountedTabs, setMountedTabs] = useState<Set<TabType>>(new Set([initialTab]));
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle browser back/forward button
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = (urlParams.get('tab') as TabType) || defaultTab;
      setActiveTab(tabFromUrl);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [defaultTab]);

  // Save scroll position when switching tabs
  const saveScrollPosition = () => {
    if (contentRef.current) {
      const scrollTop = contentRef.current.scrollTop;
      setScrollPositions((prev) => ({
        ...prev,
        [activeTab]: scrollTop,
      }));
    }
  };

  // Restore scroll position when tab changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = scrollPositions[activeTab];
    }
  }, [activeTab, scrollPositions]);

  // Preload all tabs after initial render to enable fast switching
  useEffect(() => {
    // Wait a short time after initial render, then mount all tabs
    const timer = setTimeout(() => {
      setMountedTabs(new Set(['tracks', 'albums', 'playlists', 'creators']));
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleTabClick = (tab: TabType) => {
    saveScrollPosition();
    
    // Update URL with query parameter (enables back button support)
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
    
    // Clear analytics cache to force fresh data fetch
    clearAnalyticsCache();
    
    // Force remount of the tab content to refresh data
    setMountedTabs((prev) => {
      const newSet = new Set([...prev]);
      newSet.delete(tab);
      return newSet;
    });
    
    // Set active tab and remount after a brief delay
    setActiveTab(tab);
    setTimeout(() => {
      setMountedTabs((prev) => new Set([...prev, tab]));
    }, 0);
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'tracks', label: 'Tracks', icon: '🎵' },
    { id: 'albums', label: 'Albums', icon: '💿' },
    { id: 'playlists', label: 'Playlists', icon: '📝' },
    { id: 'creators', label: 'Creators', icon: '👥' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-700 mb-6">
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 font-semibold transition-all
                whitespace-nowrap min-w-fit
                ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/10'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                }
              `}
              aria-selected={activeTab === tab.id}
              role="tab"
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - All tabs are mounted but only active tab is visible */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto"
        role="tabpanel"
        aria-labelledby={`${activeTab}-tab`}
      >
        {/* Tracks Tab */}
        <div className={activeTab === 'tracks' ? 'block' : 'hidden'}>
          {mountedTabs.has('tracks') && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">🎵 Tracks</h2>
                <DiscoverTrendingSection type="tracks" />
              </div>
            </Suspense>
          )}
        </div>

        {/* Albums Tab */}
        <div className={activeTab === 'albums' ? 'block' : 'hidden'}>
          {mountedTabs.has('albums') && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">💿 Albums</h2>
                <TrendingAlbumsErrorBoundary>
                  <TrendingAlbumsSection />
                </TrendingAlbumsErrorBoundary>
              </div>
            </Suspense>
          )}
        </div>

        {/* Playlists Tab */}
        <div className={activeTab === 'playlists' ? 'block' : 'hidden'}>
          {mountedTabs.has('playlists') && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">📝 Playlists</h2>
                <TrendingPlaylistsErrorBoundary>
                  <TrendingPlaylistsSection />
                </TrendingPlaylistsErrorBoundary>
              </div>
            </Suspense>
          )}
        </div>

        {/* Creators Tab */}
        <div className={activeTab === 'creators' ? 'block' : 'hidden'}>
          {mountedTabs.has('creators') && (
            <Suspense fallback={<TabLoadingSkeleton />}>
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">👥 Creators</h2>
                
                {/* Personalized Recommendations for Authenticated Users */}
                {user && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">✨ Suggested for You</h3>
                    <UserRecommendations 
                      title="" 
                      limit={8}
                      showProfileButton={true}
                    />
                  </div>
                )}

                {/* Popular Creators Sections */}
                <DiscoverTrendingSection type="creators" />
              </div>
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * TabLoadingSkeleton Component
 * 
 * Loading skeleton displayed while tab content is loading.
 * Provides visual feedback during data fetching.
 */
function TabLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-700 rounded w-1/4"></div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-800 rounded-lg"></div>
        ))}
      </div>
    </div>
  );
}
