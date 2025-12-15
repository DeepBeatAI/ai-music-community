# React 19 Quick Reference

## Quick Pattern Conversions

### React.FC → Function Declaration
```typescript
// Before
const Component: React.FC<Props> = ({ prop }) => <div>{prop}</div>;

// After
function Component({ prop }: Props) {
  return <div>{prop}</div>;
}
```

### forwardRef → Ref as Prop
```typescript
// Before
export const Component = forwardRef<HTMLDivElement, Props>((props, ref) => {
  return <div ref={ref}>{props.children}</div>;
});

// After
interface Props {
  ref?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}
export function Component({ ref, children }: Props) {
  return <div ref={ref}>{children}</div>;
}
```

### Optimistic Updates
```typescript
import { useOptimistic } from 'react';

const [optimisticValue, addOptimistic] = useOptimistic(
  currentValue,
  (state, newValue) => newValue
);
```

### Form Actions
```typescript
import { useActionState } from 'react';

const [state, formAction] = useActionState(
  async (prevState, formData) => {
    // Handle form submission
    return { success: true };
  },
  { success: false }
);
```

### Promise Handling
```typescript
import { use } from 'react';

function Component({ dataPromise }: { dataPromise: Promise<Data> }) {
  const data = use(dataPromise);
  return <div>{data.value}</div>;
}
```

## Common Mistakes to Avoid

❌ Don't use React.FC anymore
❌ Don't wrap everything in forwardRef
❌ Don't forget 'use client' for interactive components
❌ Don't mix server and client component patterns

✅ Use explicit function declarations
✅ Use ref as prop when possible
✅ Mark client components with 'use client'
✅ Keep server components async when fetching data
