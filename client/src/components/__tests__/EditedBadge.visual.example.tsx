/**
 * EditedBadge Visual Example
 * 
 * This file demonstrates various states of the EditedBadge component.
 * Not a test file - for documentation and visual reference only.
 */

import EditedBadge from '../EditedBadge';

export function EditedBadgeExamples() {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60000);
  const fifteenMinutesAgo = new Date(now.getTime() - 900000);
  const threeHoursAgo = new Date(now.getTime() - 10800000);
  const twoDaysAgo = new Date(now.getTime() - 172800000);
  const twoWeeksAgo = new Date(now.getTime() - 1209600000);
  const baseTime = new Date(now.getTime() - 86400000); // 1 day before edits

  return (
    <div className="p-8 space-y-6 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-4">EditedBadge Component Examples</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-gray-800 rounded">
          <p className="mb-2">Post content that was edited just now</p>
          <EditedBadge 
            createdAt={baseTime.toISOString()} 
            updatedAt={oneMinuteAgo.toISOString()} 
          />
        </div>

        <div className="p-4 bg-gray-800 rounded">
          <p className="mb-2">Post content edited 15 minutes ago</p>
          <EditedBadge 
            createdAt={baseTime.toISOString()} 
            updatedAt={fifteenMinutesAgo.toISOString()} 
          />
        </div>

        <div className="p-4 bg-gray-800 rounded">
          <p className="mb-2">Post content edited 3 hours ago</p>
          <EditedBadge 
            createdAt={baseTime.toISOString()} 
            updatedAt={threeHoursAgo.toISOString()} 
          />
        </div>

        <div className="p-4 bg-gray-800 rounded">
          <p className="mb-2">Post content edited 2 days ago</p>
          <EditedBadge 
            createdAt={baseTime.toISOString()} 
            updatedAt={twoDaysAgo.toISOString()} 
          />
        </div>

        <div className="p-4 bg-gray-800 rounded">
          <p className="mb-2">Post content edited 2 weeks ago</p>
          <EditedBadge 
            createdAt={baseTime.toISOString()} 
            updatedAt={twoWeeksAgo.toISOString()} 
          />
        </div>

        <div className="p-4 bg-gray-800 rounded">
          <p className="mb-2">Unedited post (no badge should appear)</p>
          <EditedBadge 
            createdAt={baseTime.toISOString()} 
            updatedAt={baseTime.toISOString()} 
          />
        </div>

        <div className="p-4 bg-gray-800 rounded">
          <p className="mb-2">Badge with custom styling</p>
          <EditedBadge 
            createdAt={baseTime.toISOString()} 
            updatedAt={fifteenMinutesAgo.toISOString()}
            className="ml-4 text-blue-400"
          />
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Usage in Context</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Posted by @username</span>
            <EditedBadge 
              createdAt={baseTime.toISOString()} 
              updatedAt={fifteenMinutesAgo.toISOString()} 
            />
          </div>
          <p className="text-gray-300">
            This is an example post content that has been edited.
          </p>
        </div>
      </div>
    </div>
  );
}
