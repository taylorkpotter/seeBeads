import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Stats } from '../types'

interface SSEState {
  connected: boolean
  stats: Stats | null
  lastUpdate: Date | null
}

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timeoutId: number | null = null
  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => fn(...args), ms)
  }) as T
}

export function useSSE() {
  const [state, setState] = useState<SSEState>({
    connected: false,
    stats: null,
    lastUpdate: null,
  })
  
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  
  // Debounce query invalidation to handle rapid file changes (e.g., agent bulk operations)
  const debouncedInvalidate = useMemo(
    () => debounce(() => {
      if (import.meta.env.DEV) {
        console.log('[SSE] Invalidating queries')
      }
      queryClient.invalidateQueries()
    }, 500),
    [queryClient]
  )
  
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    
    const es = new EventSource('/api/events')
    eventSourceRef.current = es
    
    es.onopen = () => {
      setState(prev => ({ ...prev, connected: true }))
      if (import.meta.env.DEV) {
        console.log('[SSE] Connected')
      }
    }
    
    es.onerror = () => {
      setState(prev => ({ ...prev, connected: false }))
      es.close()
      if (import.meta.env.DEV) {
        console.log('[SSE] Disconnected, reconnecting in 2s...')
      }
      
      // Reconnect after 2 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      reconnectTimeoutRef.current = window.setTimeout(connect, 2000)
    }
    
    es.addEventListener('init', (event) => {
      const data = JSON.parse(event.data)
      if (import.meta.env.DEV) {
        console.log('[SSE] init:', data)
      }
      setState(prev => ({
        ...prev,
        stats: data.stats,
        lastUpdate: new Date(),
      }))
    })
    
    // Handle legacy 'update' events (backwards compatibility)
    es.addEventListener('update', (event) => {
      const data = JSON.parse(event.data)
      if (import.meta.env.DEV) {
        console.log('[SSE] update:', data)
      }
      if (data.type === 'stats') {
        setState(prev => ({
          ...prev,
          stats: data.stats,
          lastUpdate: new Date(),
        }))
      }
    })
    
    // Handle 'reload' events - trigger full data refetch
    es.addEventListener('reload', (event) => {
      const data = JSON.parse(event.data)
      if (import.meta.env.DEV) {
        console.log('[SSE] reload:', data)
      }
      
      // Update stats immediately
      setState(prev => ({
        ...prev,
        stats: data.stats,
        lastUpdate: new Date(),
      }))
      
      // Invalidate all queries to trigger refetch (debounced for bulk operations)
      debouncedInvalidate()
    })
    
    es.addEventListener('heartbeat', () => {
      // Keep-alive, no action needed
    })
  }, [debouncedInvalidate])
  
  useEffect(() => {
    connect()
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])
  
  // Expose a manual refresh function
  const refresh = useCallback(() => {
    queryClient.invalidateQueries()
  }, [queryClient])
  
  return { ...state, refresh }
}
