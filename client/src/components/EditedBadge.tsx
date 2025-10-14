'use client'

interface EditedBadgeProps {
  createdAt: string;
  updatedAt: string;
  className?: string;
}

export default function EditedBadge({ 
  createdAt, 
  updatedAt, 
  className = '' 
}: EditedBadgeProps) {
  // Compare timestamps to determine if content was edited
  const createdDate = new Date(createdAt);
  const updatedDate = new Date(updatedAt);
  const isEdited = updatedDate > createdDate;

  // Reserve space even when not edited to prevent layout shift
  if (!isEdited) {
    return <span className="inline-flex items-center text-xs md:text-sm opacity-0 pointer-events-none" aria-hidden="true">(Edited)</span>;
  }

  // Format the last edit timestamp for tooltip
  const formatEditTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Edited just now';
    } else if (diffMins < 60) {
      return `Edited ${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `Edited ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `Edited ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return `Edited on ${date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      })}`;
    }
  };

  const tooltipText = formatEditTime(updatedDate);

  return (
    <span
      className={`
        inline-flex items-center text-xs md:text-sm text-gray-500 
        cursor-help transition-colors hover:text-gray-400
        focus:outline-none focus:ring-2 focus:ring-gray-500 rounded px-1
        ${className}
      `}
      title={tooltipText}
      aria-label={tooltipText}
      role="status"
      tabIndex={0}
    >
      (Edited)
    </span>
  );
}
