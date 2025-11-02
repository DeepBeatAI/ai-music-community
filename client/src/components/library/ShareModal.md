# ShareModal Component

## Overview

The `ShareModal` component provides a user-friendly interface for sharing tracks via URL and social media platforms.

## Features

- ✅ Generates shareable track URL
- ✅ Copy to clipboard functionality with visual feedback
- ✅ Social media share buttons (Twitter, Facebook, LinkedIn, Reddit)
- ✅ Success message when URL is copied
- ✅ Responsive design with dark mode support
- ✅ Keyboard navigation (Escape to close)
- ✅ Click outside to close
- ✅ Prevents body scroll when open

## Usage

```tsx
import { ShareModal } from '@/components/library/ShareModal';

function MyComponent() {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsShareModalOpen(true)}>
        Share Track
      </button>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        trackId="track-uuid-here"
        trackTitle="My Awesome Track"
        trackAuthor="Artist Name" // Optional
      />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls modal visibility |
| `onClose` | `() => void` | Yes | Callback when modal should close |
| `trackId` | `string` | Yes | Unique identifier for the track |
| `trackTitle` | `string` | Yes | Title of the track to share |
| `trackAuthor` | `string` | No | Author/artist name (displayed in modal and social shares) |
| `onCopySuccess` | `() => void` | No | Callback when URL is successfully copied to clipboard |

## URL Format

The component generates shareable URLs in the format:
```
{window.location.origin}/tracks/{trackId}
```

Example: `https://example.com/tracks/abc-123-def-456`

## Social Media Integration

The component includes share buttons for:

1. **Twitter/X** - Opens Twitter intent with track title and URL
2. **Facebook** - Opens Facebook share dialog
3. **LinkedIn** - Opens LinkedIn share dialog
4. **Reddit** - Opens Reddit submit page with track title and URL

All social media shares open in a new window with appropriate dimensions.

## Accessibility

- Modal uses proper ARIA attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`)
- Close button has `aria-label` for screen readers
- Keyboard navigation supported (Escape key to close)
- Focus management when modal opens/closes

## Requirements Fulfilled

This component fulfills **Requirement 3.8** from the My Library specification:
- Generates shareable track URL ✅
- Provides copy to clipboard button ✅
- Includes social media share buttons (optional) ✅
- Shows success message when URL copied ✅

## Implementation Notes

- Uses `navigator.clipboard.writeText()` for copying (requires HTTPS in production)
- Prevents body scroll when modal is open
- Resets copied state when modal closes
- Auto-resets "Copied!" message after 3 seconds
- Social share windows are 550x420px for optimal UX
