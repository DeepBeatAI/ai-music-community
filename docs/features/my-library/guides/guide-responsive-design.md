# Responsive Design Guide - My Library Feature

## Overview

This guide documents the responsive design implementation for the My Library feature, ensuring optimal user experience across mobile, tablet, and desktop devices.

## Breakpoint Strategy

### Tailwind CSS Breakpoints
```
sm:  640px  (small tablets)
md:  768px  (tablets)
lg:  1024px (desktops)
xl:  1280px (large desktops)
2xl: 1536px (extra large desktops)
```

### Project Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1023px
- **Desktop**: ≥ 1024px

## Component Responsive Patterns

### 1. Stats Section

**Mobile (< 768px)**: 2x3 Grid
```tsx
<div className="grid grid-cols-3 md:grid-cols-6 gap-4">
  {/* 6 stat cards */}
</div>
```
- 3 columns per row
- 2 rows total
- Compact layout for small screens

**Desktop (≥ 768px)**: 1x6 Grid
- 6 columns in single row
- Full horizontal layout
- Better use of wide screens

### 2. Track Grid

**Mobile (< 768px)**: 2 Columns
```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
  {/* Track cards */}
</div>
```
- 2 tracks per row
- Adequate card size for touch interaction
- Vertical scrolling

**Tablet (768px - 1023px)**: 3 Columns
- 3 tracks per row
- Balanced layout for medium screens

**Desktop (≥ 1024px)**: 4 Columns
- 4 tracks per row
- Optimal use of wide screens
- Maintains card readability

### 3. Albums Section

**Mobile (< 768px)**: Horizontal Scroll
```tsx
{/* Mobile: Horizontal Scroll */}
<div className="sm:hidden overflow-x-auto pb-4 -mx-4 px-4">
  <div className="flex gap-4" style={{ width: 'max-content' }}>
    {albums.map(album => (
      <div key={album.id} className="w-64 flex-shrink-0">
        <AlbumCard album={album} />
      </div>
    ))}
  </div>
</div>
```

**Key Features**:
- Fixed width cards (256px / `w-64`)
- Smooth horizontal scrolling
- Negative margins for full-width scroll area
- Padding bottom for scroll indicator space

**Tablet (768px - 1023px)**: 2 Column Grid
```tsx
{/* Desktop Grid */}
<div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {/* Album cards */}
</div>
```
- 2 albums per row
- Grid layout replaces horizontal scroll

**Desktop (≥ 1024px)**: 3-4 Column Grid
- 3 columns on standard desktop (1024px - 1279px)
- 4 columns on large desktop (≥ 1280px)
- Responsive to screen width

## Touch Interaction Guidelines

### Touch Target Sizes

**Minimum Size**: 44x44px (Apple HIG, Material Design)

**Implementation**:
```tsx
{/* Mobile: larger padding, Desktop: compact padding */}
<button className="p-3 md:p-2 hover:bg-gray-800 rounded-lg">
  <svg className="w-5 h-5">
</button>
```

**Calculation**:
- Mobile: `p-3` (12px) + `w-5` (20px) + `p-3` (12px) = 44px ✅
- Desktop: `p-2` (8px) + `w-5` (20px) + `p-2` (8px) = 36px (acceptable for mouse)

### Long-Press Interaction

**Track Card Actions Menu**:
```tsx
const handleTouchStart = () => {
  const timer = setTimeout(() => {
    setShowActions(true);
  }, 500); // 500ms long press
  setLongPressTimer(timer);
};

const handleTouchEnd = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    setLongPressTimer(null);
  }
};
```

**Features**:
- 500ms delay before triggering
- Cancels if touch ends early
- Provides tactile feedback
- Alternative to hover on mobile

## Layout Patterns

### Container Width

```tsx
<div className="max-w-7xl mx-auto">
  {/* Content */}
</div>
```

**Benefits**:
- Prevents content from being too wide on large screens
- Centers content horizontally
- Maintains readability

### Responsive Padding

```tsx
<div className="p-4 md:p-6 lg:p-8">
  {/* Content */}
</div>
```

**Scale**:
- Mobile: 16px (`p-4`)
- Tablet: 24px (`p-6`)
- Desktop: 32px (`p-8`)

### Responsive Typography

```tsx
{/* Page Title */}
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">

{/* Section Title */}
<h2 className="text-xl md:text-2xl font-bold">

{/* Card Title */}
<h3 className="text-base md:text-lg font-semibold">
```

## Text Handling

### Single-Line Truncation

```tsx
<h3 className="truncate">
  {longTitle}
</h3>
```

**Result**: "This is a very long title that will be trunca..."

### Multi-Line Truncation

```tsx
<p className="line-clamp-2">
  {longDescription}
</p>
```

**Result**: 
```
This is a long description that spans
multiple lines and will be truncated...
```

### Responsive Text Visibility

```tsx
<span className="hidden sm:inline">New Album</span>
<span className="sm:hidden">+</span>
```

**Mobile**: Shows "+"
**Desktop**: Shows "New Album"

## Image Handling

### Aspect Ratio Preservation

```tsx
{/* Square aspect ratio */}
<div className="relative aspect-square bg-gray-700">
  <img src={url} alt={alt} className="object-cover" />
</div>

{/* Fixed height with responsive width */}
<div className="relative h-48 w-full">
  <img src={url} alt={alt} className="object-cover" />
</div>
```

**`object-cover`**: Crops image to fill container while maintaining aspect ratio

### Placeholder Gradients

```tsx
<div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-600">
  <div className="text-6xl text-white opacity-80">💿</div>
</div>
```

**Benefits**:
- Visually appealing fallback
- Consistent with brand colors
- No broken image icons

## Collapsible Sections

### Implementation

```tsx
const [isCollapsed, setIsCollapsed] = useState(false);

<button
  onClick={() => setIsCollapsed(!isCollapsed)}
  className="p-3 md:p-2 hover:bg-gray-800 rounded-lg transition-colors"
>
  <svg className={`transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}>
    {/* Arrow icon */}
  </svg>
</button>

{!isCollapsed && (
  <div className="transition-all duration-300">
    {/* Content */}
  </div>
)}
```

**Features**:
- Smooth 300ms transition
- Rotating arrow indicator
- Reduces page height
- Improves mobile experience

## Loading States

### Skeleton Screens

```tsx
function SkeletonCard() {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 animate-pulse">
      <div className="aspect-square bg-gray-700"></div>
      <div className="p-4">
        <div className="h-6 bg-gray-700 rounded mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      </div>
    </div>
  );
}
```

**Benefits**:
- Shows content structure while loading
- Reduces perceived loading time
- Maintains layout stability
- Better UX than spinners

## Responsive Grid Utilities

### Common Patterns

```tsx
{/* 1 column mobile, 2 tablet, 3 desktop, 4 large desktop */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

{/* 2 columns mobile, 3 tablet, 4 desktop */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

{/* 3 columns mobile, 6 desktop (stats) */}
<div className="grid grid-cols-3 md:grid-cols-6 gap-4">
```

### Gap Sizing

- **Small gaps**: `gap-4` (16px) - for stats, compact layouts
- **Medium gaps**: `gap-6` (24px) - for cards, standard layouts
- **Large gaps**: `gap-8` (32px) - for sections, spacious layouts

## Testing Checklist

### Visual Testing
- [ ] Test at 375px (iPhone SE)
- [ ] Test at 390px (iPhone 12/13)
- [ ] Test at 768px (iPad)
- [ ] Test at 1024px (iPad Pro)
- [ ] Test at 1280px (Desktop)
- [ ] Test at 1440px (Large Desktop)

### Interaction Testing
- [ ] Touch targets ≥ 44px on mobile
- [ ] Long-press works on track cards
- [ ] Horizontal scroll smooth on albums
- [ ] Collapse/expand animations smooth
- [ ] No horizontal overflow
- [ ] Text truncates properly

### Performance Testing
- [ ] Images load progressively
- [ ] Skeleton screens show immediately
- [ ] Transitions don't cause jank
- [ ] Scroll performance smooth

## Common Issues and Solutions

### Issue: Horizontal Overflow

**Cause**: Fixed width elements or excessive padding

**Solution**:
```tsx
{/* Add container with max-width */}
<div className="max-w-7xl mx-auto px-4">
  {/* Content */}
</div>

{/* Use responsive widths */}
<div className="w-full md:w-1/2 lg:w-1/3">
```

### Issue: Touch Targets Too Small

**Cause**: Insufficient padding on mobile

**Solution**:
```tsx
{/* Increase padding on mobile */}
<button className="p-3 md:p-2">
```

### Issue: Text Overflow

**Cause**: Long text without truncation

**Solution**:
```tsx
{/* Single line */}
<p className="truncate">

{/* Multiple lines */}
<p className="line-clamp-2">
```

### Issue: Images Distorted

**Cause**: Incorrect aspect ratio or object-fit

**Solution**:
```tsx
<div className="aspect-square">
  <img className="object-cover" />
</div>
```

## Best Practices

1. **Mobile-First Approach**: Design for mobile, enhance for desktop
2. **Touch-Friendly**: Ensure adequate touch target sizes (≥ 44px)
3. **Progressive Enhancement**: Core functionality works on all devices
4. **Performance**: Lazy load images, use skeleton screens
5. **Accessibility**: Maintain proper contrast ratios, keyboard navigation
6. **Testing**: Test on real devices, not just emulators
7. **Consistency**: Use consistent spacing, typography, and colors
8. **Feedback**: Provide visual feedback for all interactions

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography)
- [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)

## Maintenance

### When Adding New Components

1. Start with mobile layout
2. Add tablet breakpoint if needed
3. Add desktop breakpoint if needed
4. Test touch interactions
5. Verify touch target sizes
6. Check text truncation
7. Test on real devices

### When Modifying Existing Components

1. Check all breakpoints still work
2. Verify touch targets remain adequate
3. Test on multiple devices
4. Update documentation
5. Run visual regression tests

---

**Last Updated**: December 2024
**Maintained By**: Development Team
**Related Docs**: 
- [Testing Guide](../testing/test-responsive-design.md)
- [Design Specifications](../../design.md)
- [Requirements](../../requirements.md)
