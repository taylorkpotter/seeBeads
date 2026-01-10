import { ReactNode, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  List, 
  Layers, 
  Clock,
  Search,
  Bot,
  Wifi,
  WifiOff,
  HelpCircle,
  X,
} from 'lucide-react'
import { useSSE } from '../hooks/useSSE'
import { useKeyboard, KEYBOARD_SHORTCUTS } from '../hooks/useKeyboard'
import { setAgentMode } from '../api/client'
import { clsx } from 'clsx'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, key: '1' },
  { path: '/issues', label: 'Issues', icon: List, key: '2' },
  { path: '/epics', label: 'Epics', icon: Layers, key: '3' },
  { path: '/timeline', label: 'Timeline', icon: Clock, key: '4' },
]

export default function Layout({ children }: LayoutProps) {
  const { connected, lastUpdate } = useSSE()
  const [agentModeEnabled, setAgentModeEnabled] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  useKeyboard({
    onSearch: () => setShowSearch(true),
    onHelp: () => setShowHelp(true),
    onClose: () => {
      setShowSearch(false)
      setShowHelp(false)
    },
  })
  
  const handleAgentModeToggle = async () => {
    const newValue = !agentModeEnabled
    try {
      await setAgentMode(newValue)
      setAgentModeEnabled(newValue)
    } catch (error) {
      console.error('Failed to toggle agent mode:', error)
    }
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Organic Floating Navigation */}
      <header className="sticky top-4 z-40 px-6 mx-6">
        <div className="bg-white/70 backdrop-blur-md rounded-full border border-border/50 shadow-soft flex items-center px-6 py-3 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">seeBeads</span>
          </div>
          
          {/* Navigation Pills */}
          <nav className="flex items-center gap-1 ml-8">
            {navItems.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-soft' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                )}
              >
                <Icon size={18} strokeWidth={2} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Search */}
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 text-muted-foreground hover:bg-white transition-all duration-300"
          >
            <Search size={18} strokeWidth={2} />
            <span className="text-sm hidden sm:inline">Search</span>
          </button>
          
          {/* Agent Mode */}
          <button
            onClick={handleAgentModeToggle}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300',
              agentModeEnabled
                ? 'bg-secondary text-secondary-foreground shadow-soft'
                : 'bg-white/50 text-muted-foreground hover:bg-white'
            )}
          >
            <Bot size={18} strokeWidth={2} />
            <span className="hidden sm:inline">Agent</span>
          </button>
          
          {/* Connection Status */}
          <div className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-full bg-white/50',
            connected ? 'text-primary' : 'text-muted-foreground'
          )}>
            {connected ? (
              <Wifi size={16} strokeWidth={2} />
            ) : (
              <WifiOff size={16} strokeWidth={2} />
            )}
          </div>
          
          {/* Help */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/50 transition-all duration-300"
          >
            <HelpCircle size={18} strokeWidth={2} />
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto relative mt-8">
        <div className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 flex items-center justify-between px-8 py-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="font-mono">.beads/beads.jsonl</span>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
          )}
        </div>
      </footer>
      
      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-foreground/10 backdrop-blur-sm flex items-start justify-center pt-32 z-50" onClick={() => setShowSearch(false)}>
          <div className="w-full max-w-2xl organic-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 p-6 border-b border-border">
              <Search size={20} strokeWidth={2} className="text-muted-foreground" />
              <input
                type="text"
                autoFocus
                placeholder="Search beads..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') setShowSearch(false)
                  if (e.key === 'Enter' && searchQuery) {
                    window.location.href = `/issues?search=${encodeURIComponent(searchQuery)}`
                  }
                }}
                className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-lg"
              />
              <button onClick={() => setShowSearch(false)} className="p-2 rounded-full hover:bg-muted transition-all">
                <X size={20} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-foreground/10 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowHelp(false)}>
          <div className="w-full max-w-md organic-card animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-display font-bold">Keyboard Shortcuts</h2>
              <button onClick={() => setShowHelp(false)} className="p-2 rounded-full hover:bg-muted transition-all">
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {KEYBOARD_SHORTCUTS.map(({ key, description }) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">{description}</span>
                  <kbd className="px-3 py-1.5 rounded-full bg-muted text-sm font-mono font-medium">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
