# Task 01: React 19 Pattern Updates

## Status: In Progress

## Objective

Update all components to use React 19 best practices and remove deprecated patterns.

## Completed Tasks

- [x] Update test files to remove React.FC
  - `client/src/__tests__/integration/performance-monitoring-hooks.test.tsx`
- [x] Create migration documentation
- [x] Verify TypeScript configuration

## Remaining Tasks

### High Priority

- [ ] Update TrackPicker component
  - Remove forwardRef wrapper
  - Use ref as prop instead
  - File: `client/src/components/dashboard/TrackPicker.tsx`

### Medium Priority

- [ ] Add useOptimistic to LikeButton
  - Implement optimistic like updates
  - File: `client/src/components/LikeButton.tsx`

- [ ] Add useOptimistic to FollowButton
  - Implement optimistic follow updates
  - File: `client/src/components/FollowButton.tsx`

### Low Priority

- [ ] Review context providers for optimization opportunities
  - `client/src/contexts/AuthContext.tsx`
  - `client/src/contexts/PlaybackContext.tsx`
  - `client/src/contexts/FollowContext.tsx`
  - `client/src/contexts/ToastContext.tsx`

- [ ] Add Error Boundaries around audio components
  - WavesurferPlayer
  - MiniPlayer

## Testing Checklist

- [ ] Run TypeScript type checking: `npm run type-check`
- [ ] Run linting: `npm run lint`
- [ ] Run unit tests: `npm test`
- [ ] Manual testing of updated components

## Notes

- All packages are already on React 19.2.1
- TypeScript config is correct with `jsx: "react-jsx"`
- Focus on incremental updates to avoid breaking changes
