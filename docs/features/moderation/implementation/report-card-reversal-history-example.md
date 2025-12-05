# Report Card Reversal History - Visual Example

## Overview

This document provides a visual representation of how the reversal history appears in report cards.

## Example 1: Report with Previous Reversals

### Visual Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Report Card                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ [⚠️ Moderator Flag] [P2 - High] [Pending] [⚠️ Previously Reversed] │
│                                                     2 hours ago     │
│                                                                     │
│ 📝 Post • Spam or Misleading Content                               │
│                                                                     │
│ Reported by: User123abc                                            │
│ Reported user: UserXyz789                                          │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ Description:                                                │   │
│ │ This user is posting spam links repeatedly                  │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ Content Preview:                                            │   │
│ │ "Check out this amazing deal! Click here..."               │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ ⚠️  Previous Action Reversed                                │   │
│ │                                                             │   │
│ │ Count: 2 actions on this post have been reversed           │   │
│ │                                                             │   │
│ │ Most Recent: content_removed on Jan 15, 2024 10:30 AM      │   │
│ │                                                             │   │
│ │ Reason: False positive - user was framed by competitor     │   │
│ │                                                             │   │
│ │ 💡 This context helps avoid repeating past mistakes.       │   │
│ │    Review carefully before taking action.                  │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ ID: 123e4567...                              [Review Report →]     │
└─────────────────────────────────────────────────────────────────────┘
```

### Color Scheme

- **Previously Reversed Badge**: Yellow background (`bg-yellow-500/20`), yellow text (`text-yellow-300`), yellow border
- **Context Panel**: Dark yellow background (`bg-yellow-900/20`), yellow border (`border-yellow-700`)
- **Warning Icon**: Yellow (`text-yellow-500`)
- **Tip Box**: Darker yellow background (`bg-yellow-900/30`)

## Example 2: Report without Previous Reversals

### Visual Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Report Card                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ [P3 - Standard] [Pending]                                          │
│                                                     5 hours ago     │
│                                                                     │
│ 💬 Comment • Harassment or Bullying                                │
│                                                                     │
│ Reported by: User456def                                            │
│ Reported user: UserAbc123                                          │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ Description:                                                │   │
│ │ This comment is targeting me personally                     │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────┐   │
│ │ Content Preview:                                            │   │
│ │ "You're terrible at making music..."                        │   │
│ └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│ ID: 987f6543...                              [Review Report →]     │
└─────────────────────────────────────────────────────────────────────┘
```

**Note**: No reversal history badge or context panel appears when there are no previous reversals.

## Example 3: Tooltip on Hover

When hovering over the "Previously Reversed" badge:

```
┌─────────────────────────────────────────────────────────────┐
│ [⚠️ Previously Reversed]                                    │
│         ↓                                                   │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 2 previous action(s) on this post were reversed.     │   │
│ │ Most recent: False positive - user was framed by     │   │
│ │ competitor                                            │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Example 4: Multiple Reversals

### High Reversal Count

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️  Previous Action Reversed                                        │
│                                                                     │
│ Count: 5 actions on this user have been reversed                   │
│                                                                     │
│ Most Recent: user_suspended on Jan 20, 2024 3:45 PM                │
│                                                                     │
│ Reason: Investigation revealed user was victim of account          │
│         compromise. All actions reversed.                          │
│                                                                     │
│ 💡 This context helps avoid repeating past mistakes.               │
│    Review carefully before taking action.                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Note**: When reversal count is high (5+), this is a strong signal to review very carefully.

## Example 5: Different Content Types

### User Report with Reversals

```
┌─────────────────────────────────────────────────────────────────────┐
│ [⚠️ Moderator Flag] [P1 - Critical] [Under Review] [⚠️ Previously Reversed]
│                                                                     │
│ 👤 User • Impersonation                                            │
│                                                                     │
│ ⚠️  Previous Action Reversed                                        │
│                                                                     │
│ Count: 1 action on this user has been reversed                     │
│                                                                     │
│ Most Recent: user_banned on Jan 18, 2024 9:00 AM                   │
│                                                                     │
│ Reason: User provided verification documents proving identity.     │
│         Ban was inappropriate.                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Track Report with Reversals

```
┌─────────────────────────────────────────────────────────────────────┐
│ [P2 - High] [Pending] [⚠️ Previously Reversed]                     │
│                                                                     │
│ 🎵 Track • Copyright Violation                                     │
│                                                                     │
│ ⚠️  Previous Action Reversed                                        │
│                                                                     │
│ Count: 3 actions on this track have been reversed                  │
│                                                                     │
│ Most Recent: content_removed on Jan 19, 2024 2:15 PM               │
│                                                                     │
│ Reason: Artist provided proof of ownership. Content was original.  │
└─────────────────────────────────────────────────────────────────────┘
```

## Interaction Flow

### Step 1: Moderator Views Queue
- Sees multiple report cards
- Yellow "Previously Reversed" badges stand out
- Draws attention to reports with reversal history

### Step 2: Quick Assessment
- Hovers over badge for tooltip
- Gets quick summary without opening report
- Decides whether to prioritize or deprioritize

### Step 3: Detailed Review
- Clicks to open full report card
- Scrolls to reversal context panel
- Reads full reversal reason and context

### Step 4: Informed Decision
- Uses historical context to inform decision
- Avoids repeating past mistakes
- Makes more accurate moderation choice

## Accessibility

### Screen Reader Support

```
Badge: "Warning: Previously Reversed. 2 previous actions on this post were reversed."

Context Panel: "Warning: Previous Action Reversed. Count: 2 actions on this post have been reversed. Most Recent: content removed on January 15, 2024 at 10:30 AM. Reason: False positive - user was framed by competitor. Tip: This context helps avoid repeating past mistakes. Review carefully before taking action."
```

### Keyboard Navigation

- Badge is focusable with Tab key
- Tooltip appears on focus
- Context panel is part of natural tab order
- All interactive elements are keyboard accessible

## Responsive Design

### Desktop View (1920px)
- Full layout as shown in examples
- All information visible without scrolling
- Comfortable spacing and padding

### Tablet View (768px)
- Badges may wrap to multiple lines
- Context panel maintains full width
- Text remains readable

### Mobile View (375px)
- Badges stack vertically
- Context panel uses full width
- Font sizes adjust for readability
- Touch targets are 44px minimum

## Performance Considerations

### Loading Strategy

1. **Initial Load**: Report card renders without reversal data
2. **Background Fetch**: `checkPreviousReversals` called asynchronously
3. **Progressive Enhancement**: Reversal indicators appear when data loads
4. **Error Handling**: Fails gracefully if reversal check fails

### Caching

- Reversal data cached in component state
- No automatic refresh (requires page reload)
- Consider implementing cache invalidation for real-time scenarios

## Related Components

- **ReportCard**: Main component displaying reversal history
- **ReversalTooltip**: Tooltip component for reversed actions
- **ModerationQueue**: Parent component displaying multiple report cards

---

**Visual Design**: Follows moderation system color coding standards  
**Accessibility**: WCAG 2.1 AA compliant  
**Responsive**: Mobile-first design approach
