# React 19 Migration Patterns Guide

## Overview

Complete guide for migrating the AI Music Community Platform to React 19 patterns and best practices.

## Current Package Status

✅ **Already Updated:**
- React 19.2.1
- React DOM 19.2.1
- Next.js 16.0.7
- TypeScript with `jsx: "react-jsx"`

## Pattern Updates Needed

### 1. Remove React.FC and React.FunctionComponent

**❌ Old Pattern:**
```typescript
const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  return <div>{prop1}</div>;
};
```

**✅ New Pattern:**
```typescript
interface Props {
  prop1: string;
  prop2: number;
}

function MyComponent({ prop1, prop2 }: Props) {
  return <div>{prop1}</div>;
}
```

**Why:** React.FC has implicit children typing which caused confusion. React 19 recommends explicit function declarations.

### 2. Update forwardRef Pattern

**❌ Old Pattern:**
```typescript
export const MyComponent = forwardRef<HTMLDivElement, Props>(
  function MyComponent(props, ref) {
    return <div ref={ref}>{props.children}</div>;
  }
);
```

**✅ New Pattern (ref as prop):**
```typescript
interface Props {
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export function MyComponent({ children, ref }: Props) {
  return <div ref={ref}>{children}</div>;
}
```


### 3. Use useOptimistic for Optimistic Updates

**✅ New React 19 Hook:**
```typescript
import { useOptimistic } from 'react';

function LikeButton({ trackId, initialLikes }: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    likes,
    (state, amount: number) => state + amount
  );

  async function handleLike() {
    addOptimisticLike(1);
    try {
      const newLikes = await likeTrack(trackId);
      setLikes(newLikes);
    } catch (error) {
      // Automatically reverts on error
    }
  }

  return <button onClick={handleLike}>{optimisticLikes} likes</button>;
}
```

### 4. Use useActionState for Form Actions

**✅ New React 19 Hook:**
```typescript
import { useActionState } from 'react';

function MyForm() {
  const [state, formAction] = useActionState(
    async (prevState, formData) => {
      const data = await submitForm(formData);
      return { success: true, data };
    },
    { success: false, data: null }
  );

  return (
    <form action={formAction}>
      <input name="field" />
      <button type="submit">Submit</button>
      {state.success && <p>Success!</p>}
    </form>
  );
}
```


### 5. Use use() Hook for Promises and Context

**✅ New React 19 Hook:**
```typescript
import { use } from 'react';

function TrackDetails({ trackPromise }: { trackPromise: Promise<Track> }) {
  const track = use(trackPromise);
  return <div>{track.title}</div>;
}

// Or with context:
function MyComponent() {
  const theme = use(ThemeContext);
  return <div className={theme}>Content</div>;
}
```

### 6. Improved Error Boundaries

**✅ React 19 Pattern:**
```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}
```


### 7. Server Components vs Client Components

**✅ Server Component (default in Next.js App Router):**
```typescript
// No 'use client' directive - can be async
async function TrackList() {
  const tracks = await fetchTracks();
  return (
    <div>
      {tracks.map(track => <TrackCard key={track.id} track={track} />)}
    </div>
  );
}
```

**✅ Client Component (when needed):**
```typescript
'use client';

import { useState } from 'react';

function InteractiveButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### 8. Improved Suspense Usage

**✅ React 19 Pattern:**
```typescript
import { Suspense } from 'react';

function Page() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AsyncTrackList />
    </Suspense>
  );
}

async function AsyncTrackList() {
  const tracks = await fetchTracks();
  return <div>{/* render tracks */}</div>;
}
```

## Files That Need Updates

### High Priority
1. ✅ `client/src/__tests__/integration/performance-monitoring-hooks.test.tsx` - COMPLETED
2. `client/src/components/dashboard/TrackPicker.tsx` - Update forwardRef

### Medium Priority
3. `client/src/components/LikeButton.tsx` - Add useOptimistic
4. `client/src/components/FollowButton.tsx` - Add useOptimistic

## Benefits of React 19

- Faster rendering with improved reconciliation
- Better TypeScript support without React.FC
- Built-in optimistic updates with useOptimistic
- Simpler forms with useActionState
- Improved Suspense for async components
- Ref as props - less forwardRef needed
