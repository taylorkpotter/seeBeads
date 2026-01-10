import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface KeyboardOptions {
  onSearch?: () => void
  onFilter?: () => void
  onHelp?: () => void
  onNavigateUp?: () => void
  onNavigateDown?: () => void
  onSelect?: () => void
  onClose?: () => void
}

export function useKeyboard(options: KeyboardOptions = {}) {
  const navigate = useNavigate()
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if typing in an input
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      if (event.key === 'Escape') {
        target.blur()
        options.onClose?.()
      }
      return
    }
    
    switch (event.key) {
      case '/':
        event.preventDefault()
        options.onSearch?.()
        break
      case 'f':
        event.preventDefault()
        options.onFilter?.()
        break
      case '?':
        event.preventDefault()
        options.onHelp?.()
        break
      case 'j':
      case 'ArrowDown':
        event.preventDefault()
        options.onNavigateDown?.()
        break
      case 'k':
      case 'ArrowUp':
        event.preventDefault()
        options.onNavigateUp?.()
        break
      case 'Enter':
        options.onSelect?.()
        break
      case 'Escape':
        options.onClose?.()
        break
      case '1':
        navigate('/')
        break
      case '2':
        navigate('/issues')
        break
      case '3':
        navigate('/epics')
        break
      case '4':
        navigate('/board')
        break
      case '5':
        navigate('/timeline')
        break
    }
  }, [navigate, options])
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export const KEYBOARD_SHORTCUTS = [
  { key: '/', description: 'Focus search' },
  { key: 'f', description: 'Open filter panel' },
  { key: 'j / ↓', description: 'Navigate down' },
  { key: 'k / ↑', description: 'Navigate up' },
  { key: 'Enter', description: 'Open selected' },
  { key: 'Esc', description: 'Close modal' },
  { key: '1-5', description: 'Switch views' },
  { key: '?', description: 'Show help' },
]
