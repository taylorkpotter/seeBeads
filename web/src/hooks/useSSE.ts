import { useEffect, useRef, useState, useCallback } from 'react'
import { Stats } from '../types'

interface SSEState {
  connected: boolean
  stats: Stats | null
  lastUpdate: Date | null
}

export function useSSE() {
  const [state, setState] = useState<SSEState>({
    connected: false,
    stats: null,
    lastUpdate: null,
  })
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    
    const es = new EventSource('/api/events')
    eventSourceRef.current = es
    
    es.onopen = () => {
      setState(prev => ({ ...prev, connected: true }))
    }
    
    es.onerror = () => {
      setState(prev => ({ ...prev, connected: false }))
      es.close()
      
      // Reconnect after 2 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      reconnectTimeoutRef.current = window.setTimeout(connect, 2000)
    }
    
    es.addEventListener('init', (event) => {
      const data = JSON.parse(event.data)
      setState(prev => ({
        ...prev,
        stats: data.stats,
        lastUpdate: new Date(),
      }))
    })
    
    es.addEventListener('update', (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'stats') {
        setState(prev => ({
          ...prev,
          stats: data.stats,
          lastUpdate: new Date(),
        }))
      }
    })
    
    es.addEventListener('heartbeat', () => {
      // Keep-alive, no action needed
    })
  }, [])
  
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
  
  return state
}
