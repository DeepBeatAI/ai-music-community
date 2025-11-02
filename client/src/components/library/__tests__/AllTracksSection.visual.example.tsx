/**
 * AllTracksSection Visual Example
 * 
 * This file demonstrates various states of the AllTracksSection component.
 * Not a test file - for documentation and visual reference only.
 */

import AllTracksSection from '../AllTracksSection';

export function AllTracksSectionExamples() {
  return (
    <div className="p-8 space-y-8 bg-gray-900 text-white min-h-screen">
      <h2 className="text-2xl font-bold mb-4">AllTracksSection Component Examples</h2>
      
      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">Desktop Layout (4 columns)</h3>
          <p className="text-gray-400 mb-4">View on desktop to see 4-column grid layout</p>
          <AllTracksSection />
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Tablet Layout (3 columns)</h3>
          <p className="text-gray-400 mb-4">Resize browser to tablet width to see 3-column layout</p>
          <div className="max-w-3xl">
            <AllTracksSection />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Mobile Layout (2 columns)</h3>
          <p className="text-gray-400 mb-4">Resize browser to mobile width to see 2-column layout</p>
          <div className="max-w-md">
            <AllTracksSection />
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Component States</h3>
          <div className="space-y-4 text-gray-400">
            <div className="p-4 bg-gray-800 rounded">
              <p className="font-semibold mb-2">Loading State:</p>
              <p>Shows 8 skeleton cards in grid layout with pulsing animation</p>
            </div>
            <div className="p-4 bg-gray-800 rounded">
              <p className="font-semibold mb-2">Error State:</p>
              <p>Shows error message with retry button</p>
            </div>
            <div className="p-4 bg-gray-800 rounded">
              <p className="font-semibold mb-2">Empty State:</p>
              <p>Shows message when no tracks exist with upload button</p>
            </div>
            <div className="p-4 bg-gray-800 rounded">
              <p className="font-semibold mb-2">Success State:</p>
              <p>Displays track cards in responsive grid with actions</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div className="p-3 bg-gray-800 rounded">
              <p className="font-semibold text-blue-400">Collapsible Section</p>
              <p>Click arrow icon to expand/collapse section</p>
            </div>
            <div className="p-3 bg-gray-800 rounded">
              <p className="font-semibold text-green-400">View All Button</p>
              <p>Shows when more than 12 tracks exist</p>
            </div>
            <div className="p-3 bg-gray-800 rounded">
              <p className="font-semibold text-purple-400">Track Actions</p>
              <p>Add to album, playlist, share, delete</p>
            </div>
            <div className="p-3 bg-gray-800 rounded">
              <p className="font-semibold text-pink-400">Membership Badges</p>
              <p>Shows album and playlist membership</p>
            </div>
            <div className="p-3 bg-gray-800 rounded">
              <p className="font-semibold text-yellow-400">Optimistic Updates</p>
              <p>Immediate UI feedback for actions</p>
            </div>
            <div className="p-3 bg-gray-800 rounded">
              <p className="font-semibold text-orange-400">Toast Notifications</p>
              <p>Success/error messages for actions</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Track Card Features</h3>
          <div className="space-y-2 text-gray-400">
            <p>• Cover art display with fallback icon</p>
            <p>• Track title and metadata</p>
            <p>• Album badge (💿) when track is in an album</p>
            <p>• Playlist badge (📝) showing playlist count</p>
            <p>• Play count with eye icon</p>
            <p>• Relative upload date (e.g., &quot;2 days ago&quot;)</p>
            <p>• Actions menu (⋮) with hover (desktop) and long-press (mobile)</p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Actions Menu</h3>
          <div className="space-y-2 text-gray-400">
            <p>• <strong>Add to Album:</strong> Opens modal to select album (exclusive)</p>
            <p>• <strong>Add to Playlist:</strong> Opens modal to select playlists (multi-select)</p>
            <p>• <strong>Copy Track URL:</strong> Copies track URL to clipboard</p>
            <p>• <strong>Share:</strong> Opens share modal with social options</p>
            <p>• <strong>Delete:</strong> Shows confirmation dialog before deletion</p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Responsive Grid Layout</h3>
          <div className="space-y-2 text-gray-400">
            <p>• Desktop (≥1024px): 4 columns</p>
            <p>• Tablet (768-1023px): 3 columns</p>
            <p>• Mobile (&lt;768px): 2 columns</p>
            <p>• Gap between cards: 1.5rem (24px)</p>
            <p>• Cards have hover effect and smooth transitions</p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Collapsible Behavior</h3>
          <div className="space-y-2 text-gray-400 p-4 bg-gray-800 rounded">
            <p>• Click arrow icon in header to toggle</p>
            <p>• Arrow rotates 90° when expanded</p>
            <p>• Smooth transition animation (300ms)</p>
            <p>• Content hidden when collapsed</p>
            <p>• View All button hidden when collapsed</p>
            <p>• State can be persisted to localStorage (future enhancement)</p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Integration Notes</h3>
          <div className="space-y-2 text-gray-400 p-4 bg-gray-800 rounded">
            <p>• Fetches data from getUserTracksWithMembership() API</p>
            <p>• Uses authenticated user by default</p>
            <p>• Accepts optional userId prop</p>
            <p>• Accepts optional initialLimit prop (default: 12)</p>
            <p>• Handles loading, error, empty, and success states</p>
            <p>• Provides retry functionality on error</p>
            <p>• Implements optimistic updates for better UX</p>
            <p>• Shows toast notifications for user feedback</p>
            <p>• Integrates with TrackCardWithActions for full functionality</p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Performance Optimizations</h3>
          <div className="space-y-2 text-gray-400">
            <p>• Limits initial query to 12 tracks</p>
            <p>• Separate query for total count (efficient)</p>
            <p>• Lazy loading for &quot;View All&quot; page</p>
            <p>• Optimistic updates reduce perceived latency</p>
            <p>• Toast auto-dismisses after 3 seconds</p>
            <p>• Smooth animations with CSS transitions</p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Requirements Coverage</h3>
          <div className="space-y-2 text-gray-400 p-4 bg-gray-800 rounded">
            <p>✅ 3.1: Display tracks in grid layout</p>
            <p>✅ 3.2: Display maximum 8-12 tracks initially</p>
            <p>✅ 3.3: &quot;View All&quot; button when &gt;12 tracks</p>
            <p>✅ 6.3: Collapsible section implementation</p>
            <p>✅ 6.4: Expand/collapse toggle button</p>
            <p>✅ 6.9: 2-column grid on mobile devices</p>
            <p>✅ 9.4: Section-specific error with retry</p>
            <p>✅ 10.2: Lazy loading for section</p>
          </div>
        </div>
      </div>
    </div>
  );
}
