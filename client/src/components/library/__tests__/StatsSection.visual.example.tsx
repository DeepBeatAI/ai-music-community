/**
 * StatsSection Visual Example
 * 
 * This file demonstrates various states of the StatsSection component.
 * Not a test file - for documentation and visual reference only.
 */

import StatsSection from '../StatsSection';

export function StatsSectionExamples() {
  return (
    <div className="p-8 space-y-8 bg-gray-900 text-white min-h-screen">
      <h2 className="text-2xl font-bold mb-4">StatsSection Component Examples</h2>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">Desktop Layout (6 columns)</h3>
          <p className="text-gray-400 mb-4">View on desktop to see 1 row x 6 columns layout</p>
          <StatsSection />
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Mobile Layout (3 columns)</h3>
          <p className="text-gray-400 mb-4">Resize browser to mobile width to see 2 rows x 3 columns layout</p>
          <div className="max-w-md">
            <StatsSection />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Component States</h3>
          <div className="space-y-4 text-gray-400">
            <div className="p-4 bg-gray-800 rounded">
              <p className="font-semibold mb-2">Loading State:</p>
              <p>Shows 6 skeleton cards with pulsing animation</p>
            </div>
            <div className="p-4 bg-gray-800 rounded">
              <p className="font-semibold mb-2">Error State:</p>
              <p>Shows error message with retry button</p>
            </div>
            <div className="p-4 bg-gray-800 rounded">
              <p className="font-semibold mb-2">Success State:</p>
              <p>Displays 6 stat cards with icons, values, and labels</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Stat Cards</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div className="p-3 bg-gray-800 rounded">
              <p className="font-semibold text-blue-400">📤 Upload Remaining</p>
              <p>Shows ∞ for infinite uploads (MVP)</p>
            </div>
            <div className="p-3 bg-gray-800 rounded">
              <p className="font-semibold text-green-400">🎵 Total Tracks</p>
              <p>Count of user&apos;s uploaded tracks</p>
            </div>
            <div className="p-3 bg-gray-800 rounded">
              <p className="font-semibold text-purple-400">💿 Total Albums</p>
              <p>Count of user&apos;s created albums</p>
            </div>
            <div className="p-3 bg-gray-800 rounded">
              <p className="font-semibold text-pink-400">📝 Total Playlists</p>
              <p>Count of user&apos;s created playlists</p>
            </div>
            <div className="p-3 bg-gray-800 rounded">
              <p className="font-semibold text-yellow-400">📊 Plays This Week</p>
              <p>Play count for last 7 days</p>
            </div>
            <div className="p-3 bg-gray-800 rounded">
              <p className="font-semibold text-orange-400">🎧 Total Plays</p>
              <p>All-time play count (formatted)</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Responsive Behavior</h3>
          <div className="space-y-2 text-gray-400">
            <p>• Desktop (≥768px): 1 row × 6 columns</p>
            <p>• Mobile (&lt;768px): 2 rows × 3 columns</p>
            <p>• Cards have hover effect (border color change)</p>
            <p>• Loading skeletons match card layout</p>
            <p>• Error state is centered and prominent</p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Integration Notes</h3>
          <div className="space-y-2 text-gray-400 p-4 bg-gray-800 rounded">
            <p>• Fetches data from getLibraryStats() API</p>
            <p>• Uses authenticated user by default</p>
            <p>• Accepts optional userId prop</p>
            <p>• Handles loading, error, and success states</p>
            <p>• Provides retry functionality on error</p>
            <p>• Formats large numbers with toLocaleString()</p>
          </div>
        </div>
      </div>
    </div>
  );
}
