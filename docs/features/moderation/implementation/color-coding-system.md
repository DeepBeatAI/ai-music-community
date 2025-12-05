# Moderation System Color Coding Implementation

## Overview

This document describes the consistent color coding system implemented across all moderation components to provide clear visual indicators of action states.

**Requirements:** 15.4

## Color Specifications

### Active Actions
- **Color:** Red (#DC2626) or Orange (#EA580C)
- **Usage:** Currently active moderation actions (suspensions, restrictions, warnings)
- **Tailwind Classes:** `bg-red-600`, `text-red-600`, `bg-red-900`, `text-red-200`
- **Visual Treatment:** Normal display, no strikethrough

### Reversed Actions
- **Color:** Gray (#6B7280)
- **Usage:** Actions that have been reversed/revoked by moderators
- **Tailwind Classes:** `bg-gray-600`, `text-gray-300`, `bg-gray-500`
- **Visual Treatment:** Strikethrough text, dimmed appearance

### Expired Actions
- **Color:** Blue (#2563EB)
- **Usage:** Time-based actions that have naturally expired
- **Tailwind Classes:** `bg-blue-600`, `text-blue-600`, `bg-blue-900`, `text-blue-200`
- **Visual Treatment:** Normal display, no strikethrough

## Component Implementation

### ActionStateBadge Component
**Location:** `client/src/components/moderation/ActionStateBadge.tsx`

Central component that provides consistent badge styling for action states:

```typescript
// Active state
{
  label: 'ACTIVE',
  bgColor: 'bg-red-900',
  textColor: 'text-red-200',
  strikethrough: false,
}

// Reversed state
{
  label: 'REVERSED',
  bgColor: 'bg-gray-600',
  textColor: 'text-gray-300',
  strikethrough: true,
}

// Expired state
{
  label: 'EXPIRED',
  bgColor: 'bg-blue-900',
  textColor: 'text-blue-200',
  strikethrough: false,
}
```

**Utility Functions:**
- `getStateColor(state)` - Returns hex color code for charts/visualizations
- `isActionReversed(action)` - Check if action is reversed
- `isActionExpired(action)` - Check if action is expired
- `isActionActive(action)` - Check if action is active

### ModerationLogs Component
**Location:** `client/src/components/moderation/ModerationLogs.tsx`

**Implementation:**
- Uses `ActionStateBadge` component for consistent state display
- Action type badges use Red (#DC2626) for active actions
- Reversed actions show with Gray (#6B7280) and strikethrough
- Tooltip displays reversal details on hover

### ModerationHistoryTimeline Component
**Location:** `client/src/components/moderation/ModerationHistoryTimeline.tsx`

**Implementation:**
- Timeline markers use color-coded dots:
  - Active: Red (#DC2626) marker with red ring
  - Reversed: Gray (#6B7280) marker with gray ring
  - Expired: Blue (#2563EB) marker with blue ring
- Self-reversals highlighted with yellow ring
- Color legend displayed at bottom of timeline

### UserStatusPanel Component
**Location:** `client/src/components/moderation/UserStatusPanel.tsx`

**Implementation:**
- Suspension section: Red (#DC2626) border and background
- Restrictions section: Orange (#EA580C) border and background
- Action summary counts:
  - Active actions: Red (#DC2626)
  - Reversed actions: Gray (#6B7280)
  - Total actions: Default gray

### ReversalHistoryView Component
**Location:** `client/src/components/moderation/ReversalHistoryView.tsx`

**Implementation:**
- All reversed action badges use Gray (#6B7280)
- Summary statistics use Gray (#6B7280) for reversal metrics
- Self-reversal badges use yellow for distinction

### ReportCard Component
**Location:** `client/src/components/moderation/ReportCard.tsx`

**Implementation:**
- Priority badges:
  - P1 (Critical): Red (#DC2626)
  - P2 (High): Orange (#EA580C)
  - P3-P5: Standard colors
- Reversal indicators shown when action is reversed

## Consistency Guidelines

### When to Use Each Color

**Red (#DC2626):**
- Active suspensions
- Active bans
- High-priority reports (P1)
- Critical actions requiring immediate attention

**Orange (#EA580C):**
- Active restrictions
- Medium-high priority reports (P2)
- Warning-level actions

**Gray (#6B7280):**
- ALL reversed/revoked actions
- Inactive or historical actions
- Strikethrough text for reversed items

**Blue (#2563EB):**
- Expired time-based actions
- Actions that completed naturally
- No longer enforceable but not reversed

### Visual Treatment Rules

1. **Strikethrough:** ONLY for reversed actions (Gray #6B7280)
2. **Opacity:** Reversed actions may use reduced opacity (0.75) for dimming
3. **Badges:** Use rounded-full style with consistent padding
4. **Hover States:** Display reversal details in tooltips
5. **Icons:** Use consistent emoji/icons across components

## Testing Checklist

- [ ] All active actions display in Red or Orange
- [ ] All reversed actions display in Gray with strikethrough
- [ ] All expired actions display in Blue
- [ ] ActionStateBadge component used consistently
- [ ] Color legend matches implementation
- [ ] Tooltips show reversal details
- [ ] Self-reversals highlighted appropriately
- [ ] Summary statistics use correct colors
- [ ] Mobile responsive color display

## Future Enhancements

1. Consider adding color-blind friendly patterns/icons
2. Add dark mode color variants if needed
3. Implement accessibility labels for screen readers
4. Add animation transitions for state changes

## Related Requirements

- **15.1:** Display reversed actions with visual indicators
- **15.4:** Consistent color coding across all components
- **15.5:** Tooltip with reversal details on hover
- **15.6:** Timeline view with color-coded progression
- **15.7:** Highlight self-reversals
- **15.8:** Summary count of active vs reversed actions

## References

- Design Document: `.kiro/specs/moderation-system/design.md`
- Requirements Document: `.kiro/specs/moderation-system/requirements.md`
- ActionStateBadge Component: `client/src/components/moderation/ActionStateBadge.tsx`
