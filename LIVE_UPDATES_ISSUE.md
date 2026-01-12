# seeBeads Live Updates Issue & Fix

## Problem

seeBeads has **all the infrastructure for live updates** (file watcher + SSE), but updates aren't reaching the browser in real-time. Changes to `.beads/issues.jsonl` require a full restart to be visible.

## Root Cause Analysis

After reviewing the code, the live update system is **correctly implemented**:

1. ✅ **File Watcher** (`internal/beads/watcher.go`):
   - Uses `fsnotify` to watch for file changes
   - 100ms debounce (2s in agent mode)
   - Triggers `OnChange` callback on WRITE events

2. ✅ **SSE Hub** (`internal/server/sse.go`):
   - Manages WebSocket-like connections
   - Broadcasts events to all connected clients
   - 30-second heartbeat to keep connections alive

3. ✅ **Frontend Hook** (`web/src/hooks/useSSE.ts`):
   - Connects to `/api/events`
   - Listens for `update` events
   - Auto-reconnects on disconnect

4. ✅ **Integration** (`internal/server/server.go:216-224`):
   - Watcher's `OnChange` callback broadcasts SSE events
   - SSE event includes updated stats

## The Issue

**The frontend only listens for `stats` updates, but doesn't refetch the full bead list.**

### Current Flow:
```
File Change → Watcher → SSE Broadcast (stats only) → Frontend updates stats
```

### What's Missing:
The frontend `useSSE` hook updates `stats` but **doesn't trigger a refetch** of the bead list. The components likely fetch beads once on mount and never again.

## Recommended Fix

### Option 1: Broadcast Full Data (Simple, More Bandwidth)

**Backend Change** (`internal/server/server.go:216-224`):
```go
OnChange: func() {
    // Broadcast full update instead of just stats
    s.sse.Broadcast(SSEEvent{
        Type: "reload",
        Data: map[string]interface{}{
            "timestamp": time.Now().Format(time.RFC3339),
            "stats":     s.graph.GetStats(),
        },
    })
}
```

**Frontend Change** (`web/src/hooks/useSSE.ts:52-61`):
```typescript
// Add new event listener for full reload
es.addEventListener('reload', (event) => {
  const data = JSON.parse(event.data)
  // Trigger full data refetch
  window.dispatchEvent(new CustomEvent('beads:reload', { detail: data }))
  
  setState(prev => ({
    ...prev,
    stats: data.stats,
    lastUpdate: new Date(),
  }))
})
```

**Component Change** (e.g., `web/src/views/Issues.tsx`):
```typescript
useEffect(() => {
  const handleReload = () => {
    // Refetch beads when file changes
    refetchBeads()
  }
  
  window.addEventListener('beads:reload', handleReload)
  return () => window.removeEventListener('beads:reload', handleReload)
}, [])
```

### Option 2: Incremental Updates (Complex, Efficient)

Send delta updates (added/changed/removed beads) via SSE instead of refetching everything.

**Pros:** More efficient for large datasets  
**Cons:** Complex change detection logic needed

### Option 3: Poll on Stats Change (Quick Fix)

**Frontend Change** (`web/src/hooks/useSSE.ts:52-61`):
```typescript
es.addEventListener('update', (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'stats') {
    setState(prev => ({
      ...prev,
      stats: data.stats,
      lastUpdate: new Date(),
    }))
    
    // Trigger refetch when stats change
    window.dispatchEvent(new Event('beads:refetch'))
  }
})
```

## Testing the Fix

After implementing Option 1 (recommended):

1. Start seeBeads: `seebeads serve --open`
2. Open browser console, should see SSE connection
3. In another terminal: `bd create "Test live update" --type task`
4. Browser should **immediately** show the new bead (no refresh needed)

## Current Workaround

Until fixed, restart seeBeads to see changes:
```bash
pkill seebeads && seebeads serve --open
```

Or add a "Refresh" button in the UI that calls the API again.

## Why It Worked Before

The old behavior might have worked if:
- You had dev server running with hot reload (React dev mode)
- You were using SQLite mode with daemon that sent updates differently
- There was polling logic that got removed

## Priority

**Medium** - The infrastructure is solid, just needs the final connection between SSE events and UI data refetch. This is a quality-of-life issue, not a critical bug.

## Estimated Fix Time

~30 minutes for Option 1 (simple reload event)

---

## Additional Recommendations (from repair-agent review)

### 1. Add Manual Refresh Button

Even with SSE working, add a "Refresh" button in the UI header as a fallback:
- SSE connections can drop temporarily
- Users may want to force-refresh after bulk operations
- Provides visual feedback that data is being fetched

```tsx
// In Layout.tsx or header component
<button 
  onClick={() => window.dispatchEvent(new Event('beads:refetch'))}
  className="text-sm text-gray-500 hover:text-gray-700"
>
  ↻ Refresh
</button>
```

### 2. Add Visual Indicator for Live Connection

Show SSE connection status in the UI:
```tsx
// Using the existing useSSE hook
const { connected } = useSSE()

<span className={connected ? "text-green-500" : "text-red-500"}>
  {connected ? "● Live" : "○ Disconnected"}
</span>
```

### 3. Consider Debouncing Refetches

If multiple rapid file changes occur (e.g., agent bulk-closing beads), debounce the refetch to avoid hammering the API:

```typescript
// In useSSE.ts
import { debounce } from 'lodash-es'

const debouncedRefetch = useMemo(
  () => debounce(() => {
    window.dispatchEvent(new Event('beads:refetch'))
  }, 500),
  []
)

es.addEventListener('reload', (event) => {
  const data = JSON.parse(event.data)
  setState(prev => ({ ...prev, stats: data.stats, lastUpdate: new Date() }))
  debouncedRefetch()
})
```

### 4. Log SSE Events in Dev Mode

For debugging, log SSE events when in development:
```typescript
es.addEventListener('update', (event) => {
  if (import.meta.env.DEV) {
    console.log('[SSE] update:', JSON.parse(event.data))
  }
  // ... rest of handler
})
```

## Verification Checklist

After implementing the fix:
- [ ] File changes trigger SSE broadcast (check server logs)
- [ ] Browser receives SSE event (check Network tab → EventStream)
- [ ] `beads:refetch` event is dispatched (check console)
- [ ] Bead list UI updates without manual refresh
- [ ] Works in agent-mode (2s debounce)
- [ ] Reconnects after network interruption
