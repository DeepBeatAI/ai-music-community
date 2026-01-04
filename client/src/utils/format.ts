export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const formatTimeAgo = (date: string): string => {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return past.toLocaleDateString();
};

export const formatDuration = (seconds: number): string => {
  if (isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Parse multiple timestamps from a comma-separated string
 * @param audioTimestamp - Comma-separated timestamp string (e.g., "2:35, 5:12, 8:45")
 * @returns Array of trimmed timestamp strings
 * 
 * Requirements: 10.5, 10.6
 */
export const parseTimestamps = (audioTimestamp: string | undefined | null): string[] => {
  if (!audioTimestamp) {
    return [];
  }

  return audioTimestamp
    .split(',')
    .map(timestamp => timestamp.trim())
    .filter(timestamp => timestamp.length > 0);
};

/**
 * Convert a timestamp string to seconds
 * @param timestamp - Timestamp in MM:SS or HH:MM:SS format (e.g., "2:35" or "1:23:45")
 * @returns Number of seconds, or 0 if invalid format
 * 
 * Requirements: 10.3
 */
export const parseTimestampToSeconds = (timestamp: string | undefined | null): number => {
  if (!timestamp) {
    return 0;
  }

  // Trim whitespace
  const trimmed = timestamp.trim();
  
  // Split by colon
  const parts = trimmed.split(':');
  
  // Must have 2 or 3 parts (MM:SS or HH:MM:SS)
  if (parts.length < 2 || parts.length > 3) {
    return 0;
  }

  // Validate that each part contains only digits (no decimals, special chars, etc.)
  const allDigits = parts.every(part => /^\d+$/.test(part));
  if (!allDigits) {
    return 0;
  }

  // Parse each part as a number
  const numbers = parts.map(part => parseInt(part, 10));
  
  // Check if all parts are valid numbers (should always be true after regex check)
  if (numbers.some(num => isNaN(num) || num < 0)) {
    return 0;
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (numbers.length === 2) {
    // MM:SS format
    [minutes, seconds] = numbers;
  } else {
    // HH:MM:SS format
    [hours, minutes, seconds] = numbers;
  }

  // Validate ranges (seconds and minutes should be 0-59)
  if (seconds >= 60 || minutes >= 60) {
    return 0;
  }

  // Calculate total seconds
  return hours * 3600 + minutes * 60 + seconds;
};