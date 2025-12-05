# Reversal Tooltip Locations Guide

## Visual Reference for Tooltip Placement

This guide shows where reversal tooltips appear throughout the moderation system.

---

## 1. Action Logs Table

**Location:** `/moderation` → Action Logs Tab

```
┌─────────────────────────────────────────────────────────────┐
│ Action Logs                                                  │
├─────────────────────────────────────────────────────────────┤
│ Date       │ Action Type │ Target User │ Moderator │ Reason │
├─────────────────────────────────────────────────────────────┤
│ [HOVER ME] │ Suspended   │ user123...  │ mod456... │ Spam   │ ← Tooltip appears above
│ ↑          │ [REVERSED]  │             │           │        │
│ Tooltip    │             │             │           │        │
│ shows here │             │             │           │        │
└─────────────────────────────────────────────────────────────┘
```

**Tooltip Position:** Top
**Trigger:** Hover over any table row with a reversed action
**Content:** Moderator, timestamp, reason, self-reversal indicator

---

## 2. User Status Panel

**Location:** User profile → Moderation section

```
┌─────────────────────────────────────────────────────────────┐
│ Recent Moderation History                                    │
├─────────────────────────────────────────────────────────────┤
│ [HOVER ME] User Suspended [REVERSED]                        │ → Tooltip
│            2024-01-15 10:30 AM                               │   appears
│            Reason: Spam posting                              │   to the
│            Reversal: False positive                          │   right
│                                                              │
│ User Warned                                                  │
│ 2024-01-10 09:15 AM                                         │
│ Reason: Minor violation                                      │
└─────────────────────────────────────────────────────────────┘
```

**Tooltip Position:** Right
**Trigger:** Hover over any history entry with a reversed action
**Content:** Moderator, timestamp, reason, self-reversal indicator

---

## 3. Report Card

**Location:** Moderation Queue

```
┌─────────────────────────────────────────────────────────────┐
│ Report #12345                                                │
│ Type: Post | Reason: Spam | Priority: P2                    │
├─────────────────────────────────────────────────────────────┤
│ Content preview...                                           │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [HOVER ME] ✓ Action Reversed                            │ │
│ │ ↑                                                        │ │
│ │ Tooltip shows here                                       │ │
│ │ This action was reversed on Jan 20, 2024                │ │
│ │ Reason: False positive - user was framed                │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Tooltip Position:** Top
**Trigger:** Hover over the "Action Reversed" indicator
**Content:** Moderator, timestamp, reason, self-reversal indicator

---

## 4. Metrics Dashboard - Recent Reversals

**Location:** `/moderation` → Metrics Tab

```
┌─────────────────────────────────────────────────────────────┐
│ Recent Reversals                                             │
├─────────────────────────────────────────────────────────────┤
│ [HOVER ME] User Suspended                    View Details → │
│ ↑          Jan 20, 2024                                      │
│ Tooltip    False positive                                    │
│ shows      ←─────────────────────────────────────────────────┤
│ to left    User Warned                       View Details → │
│            Jan 19, 2024                                      │
│            Mistake in judgment                               │
└─────────────────────────────────────────────────────────────┘
```

**Tooltip Position:** Left
**Trigger:** Hover over any recent reversal item
**Content:** Moderator, timestamp, reason, self-reversal indicator

---

## 5. Moderation History Timeline

**Location:** User profile → Timeline view

```
┌─────────────────────────────────────────────────────────────┐
│ Moderation Timeline                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ●─────────────────────────────────────────────────────────┐│
│  │ [HOVER ME] User Suspended [REVERSED]                    ││ → Tooltip
│  │ ↑          Jan 15, 2024                                  ││   appears
│  │ Tooltip    Reason: Spam posting                          ││   to the
│  │ shows      ↩️ Reversed: False positive                   ││   right
│  │ here       Jan 20, 2024                                  ││
│  └─────────────────────────────────────────────────────────┘│
│  │                                                           │
│  ●─────────────────────────────────────────────────────────┐│
│  │ User Warned                                              ││
│  │ Jan 10, 2024                                             ││
│  │ Reason: Minor violation                                  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Tooltip Position:** Right
**Trigger:** Hover over any timeline entry (marker or card) with a reversed action
**Content:** Moderator, timestamp, reason, self-reversal indicator

---

## 6. Moderator Reversal Statistics

**Location:** `/moderation` → Metrics Tab → Moderator Stats

```
┌─────────────────────────────────────────────────────────────┐
│ Moderator Reversals                                          │
├─────────────────────────────────────────────────────────────┤
│ [HOVER ME] User Suspended on post                           │
│ ↑          Original reason: Spam                             │
│ Tooltip    ┌──────────────────────────────────────────────┐ │
│ shows      │ Reversal Reason:                             │ │
│ to left    │ False positive - user was framed             │ │
│            └──────────────────────────────────────────────┘ │
│            Created: Jan 15, 2024 | Reversed: Jan 20, 2024  │
│            Time to reversal: 5 days                         │
└─────────────────────────────────────────────────────────────┘
```

**Tooltip Position:** Left
**Trigger:** Hover over any reversal card in moderator statistics
**Content:** Moderator, timestamp, reason, self-reversal indicator

---

## Tooltip Content Structure

All tooltips display the same information in a consistent format:

```
┌─────────────────────────────────────────┐
│ ✓ Action Reversed                       │
├─────────────────────────────────────────┤
│ Reversed by:                            │
│ Moderator mod456... [Self-Reversal]    │ ← Badge if applicable
│                                         │
│ Reversed on:                            │
│ 5 days ago                              │ ← Relative time
│ (Jan 20, 2024 2:30 PM)                 │ ← Absolute time
│                                         │
│ Reason:                                 │
│ False positive - user was framed        │
│ after investigation                     │
└─────────────────────────────────────────┘
```

---

## Interaction Patterns

### Mouse Interaction
1. **Hover:** Move mouse over reversed action element
2. **Display:** Tooltip fades in smoothly (0.2s)
3. **Stay:** Tooltip remains visible while hovering
4. **Leave:** Move mouse away, tooltip fades out

### Visual Cues
- **Cursor:** Changes to help icon (?) when hovering over tooltip-enabled elements
- **Opacity:** Reversed actions have reduced opacity (75%)
- **Strikethrough:** Reversed action text has strikethrough styling
- **Badge:** "REVERSED" badge appears next to action type

### Positioning Logic
- Tooltip automatically adjusts to stay within viewport
- Prefers configured position (top/bottom/left/right)
- Falls back to alternative position if space is limited
- Arrow indicator points to trigger element

---

## Accessibility Features

### Visual
- High contrast text (white on dark gray)
- Clear typography with adequate font size
- Sufficient padding and spacing
- Visual arrow indicator for context

### Interactive
- Cursor changes indicate interactivity
- Smooth animations don't cause motion sickness
- Tooltip doesn't block underlying content
- Works with keyboard navigation (focus events)

### Semantic
- Meaningful content structure
- Clear labels for all information
- Consistent formatting across all tooltips
- Self-reversal clearly indicated

---

## Mobile Considerations

While the current implementation is optimized for desktop hover interactions, mobile support can be added:

### Recommended Mobile Behavior
1. **Tap to Show:** Single tap displays tooltip
2. **Tap Outside to Hide:** Tap anywhere else to dismiss
3. **Swipe to Dismiss:** Swipe tooltip away
4. **Auto-Hide:** Automatically hide after 5 seconds

### Mobile-Specific Positioning
- Prefer bottom position for better thumb reach
- Ensure tooltip doesn't cover action buttons
- Use larger touch targets (44x44px minimum)
- Provide clear close button

---

## Testing Checklist

Use this checklist to verify tooltip functionality:

### Visual Testing
- [ ] Tooltip appears on hover
- [ ] Tooltip displays correct information
- [ ] Tooltip has proper styling (colors, borders, shadows)
- [ ] Tooltip animation is smooth
- [ ] Arrow indicator points correctly

### Positioning Testing
- [ ] Tooltip stays within viewport on all screen sizes
- [ ] Tooltip adjusts position when near edges
- [ ] Tooltip doesn't overlap important content
- [ ] Tooltip arrow points to trigger element

### Content Testing
- [ ] Moderator information is correct
- [ ] Timestamp is formatted properly
- [ ] Reversal reason is displayed completely
- [ ] Self-reversal badge appears when applicable
- [ ] Text wraps properly for long content

### Interaction Testing
- [ ] Tooltip appears on mouse enter
- [ ] Tooltip disappears on mouse leave
- [ ] Tooltip doesn't interfere with clicking
- [ ] Tooltip works with keyboard navigation
- [ ] Tooltip updates on window resize/scroll

---

## Troubleshooting

### Tooltip Not Appearing
- Check if action has `revoked_at` and `revoked_by` fields
- Verify `ReversalTooltip` component is imported
- Ensure element is wrapped correctly
- Check z-index conflicts

### Tooltip Positioning Issues
- Verify viewport boundary detection is working
- Check for CSS overflow: hidden on parent elements
- Ensure tooltip has sufficient space
- Test on different screen sizes

### Content Display Issues
- Verify action object has all required fields
- Check metadata for reversal_reason
- Ensure date formatting is working
- Verify text wrapping for long content

---

## Summary

Reversal tooltips are now integrated across all 6 major components in the moderation system:

1. ✅ Action Logs Table (top position)
2. ✅ User Status Panel (right position)
3. ✅ Report Card (top position)
4. ✅ Metrics Dashboard (left position)
5. ✅ Moderation Timeline (right position)
6. ✅ Moderator Statistics (left position)

Each tooltip provides consistent, detailed information about action reversals, enhancing the user experience and making it easier for moderators to understand the history and context of reversed actions.
