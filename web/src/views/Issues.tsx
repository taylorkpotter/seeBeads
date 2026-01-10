import { useState, useEffect } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getBeads } from '../api/client'
import { Status, BeadType, Filter } from '../types'
import BeadRow from '../components/BeadRow'
import BeadDetail from '../components/BeadDetail'
import { useKeyboard } from '../hooks/useKeyboard'
import { Filter as FilterIcon, X, Zap } from 'lucide-react'
import { clsx } from 'clsx'

const STATUS_OPTIONS: Status[] = ['open', 'in_progress', 'blocked', 'deferred', 'closed']
const TYPE_OPTIONS: BeadType[] = ['task', 'bug', 'feature', 'epic', 'chore']
const PRIORITY_OPTIONS = [0, 1, 2, 3, 4]

export default function Issues() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { id } = useParams()
  
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  
  // Parse filter from URL
  const filter: Filter = {
    status: searchParams.get('status')?.split(',').filter(Boolean) as Status[] || undefined,
    type: searchParams.get('type')?.split(',').filter(Boolean) as BeadType[] || undefined,
    priority: searchParams.get('priority')?.split(',').map(Number).filter(n => !isNaN(n)) || undefined,
    search: searchParams.get('search') || undefined,
    ready: searchParams.get('ready') === 'true' || undefined,
    limit: 100,
  }
  
  const { data, isLoading } = useQuery({
    queryKey: ['beads', filter],
    queryFn: () => getBeads(filter),
  })
  
  const [selectedBead, setSelectedBead] = useState<string | null>(id || null)
  
  useEffect(() => {
    if (id) setSelectedBead(id)
  }, [id])
  
  useKeyboard({
    onNavigateDown: () => {
      if (data?.beads) {
        setSelectedIndex(i => Math.min(i + 1, data.beads.length - 1))
      }
    },
    onNavigateUp: () => {
      setSelectedIndex(i => Math.max(i - 1, 0))
    },
    onSelect: () => {
      if (data?.beads[selectedIndex]) {
        setSelectedBead(data.beads[selectedIndex].id)
      }
    },
    onFilter: () => setShowFilters(s => !s),
    onClose: () => {
      setSelectedBead(null)
      setShowFilters(false)
    },
  })
  
  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    setSearchParams(params)
  }
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilter('search', searchInput || null)
  }
  
  const clearFilters = () => {
    setSearchParams(new URLSearchParams())
    setSearchInput('')
  }
  
  const hasActiveFilters = filter.status?.length || filter.type?.length || filter.priority?.length || filter.search || filter.ready
  
  return (
    <div className="flex flex-col h-full bg-industrial-background">
      {/* Toolbar */}
      <div className="p-6 border-b border-industrial-border-dark bg-industrial-background shadow-neu-card sticky top-0 z-20">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          {/* Search - Recessed Input */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search beads..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full px-4 py-3 bg-industrial-background rounded-lg shadow-neu-recessed text-industrial-text placeholder-industrial-text-muted/50 outline-none transition-all text-sm font-medium focus:shadow-neu-pressed"
            />
          </form>
          
          {/* Filter Toggle - Physical Button */}
          <button
            onClick={() => setShowFilters(s => !s)}
            className={clsx(
              'flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-bold uppercase tracking-wide transition-all',
              showFilters || hasActiveFilters
                ? 'bg-industrial-accent text-industrial-accent-foreground shadow-neu-button'
                : 'bg-industrial-background text-industrial-text shadow-neu-card hover:shadow-neu-floating'
            )}
          >
            <FilterIcon size={16} strokeWidth={2} />
            Filters
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full bg-industrial-background text-industrial-text text-xs flex items-center justify-center font-bold shadow-neu-recessed">
                {(filter.status?.length || 0) + (filter.type?.length || 0) + (filter.priority?.length || 0) + (filter.search ? 1 : 0) + (filter.ready ? 1 : 0)}
              </span>
            )}
          </button>
          
          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wide text-industrial-accent bg-industrial-background shadow-neu-card hover:shadow-neu-pressed transition-all"
            >
              <X size={16} strokeWidth={2} />
              Clear
            </button>
          )}
          
          {/* Results Count */}
          <div className="text-sm font-semibold text-industrial-text-muted ml-auto">
            {data?.total || 0} results
          </div>
        </div>
        
        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-6 p-6 bg-industrial-muted/30 rounded-xl animate-slide-in shadow-neu-recessed max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Status Filter */}
              <div>
                <label className="text-xs font-bold text-industrial-text uppercase tracking-wide mb-3 block">Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        const current = filter.status || []
                        const newValue = current.includes(status)
                          ? current.filter(s => s !== status)
                          : [...current, status]
                        updateFilter('status', newValue.length ? newValue.join(',') : null)
                      }}
                      className={clsx(
                        'px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-all',
                        filter.status?.includes(status)
                          ? 'bg-industrial-accent text-industrial-accent-foreground shadow-neu-button'
                          : 'bg-industrial-background text-industrial-text shadow-neu-card hover:shadow-neu-floating'
                      )}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Type Filter */}
              <div>
                <label className="text-xs font-bold text-industrial-text uppercase tracking-wide mb-3 block">Type</label>
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        const current = filter.type || []
                        const newValue = current.includes(type)
                          ? current.filter(t => t !== type)
                          : [...current, type]
                        updateFilter('type', newValue.length ? newValue.join(',') : null)
                      }}
                      className={clsx(
                        'px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-all',
                        filter.type?.includes(type)
                          ? 'bg-industrial-accent text-industrial-accent-foreground shadow-neu-button'
                          : 'bg-industrial-background text-industrial-text shadow-neu-card hover:shadow-neu-floating'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Priority Filter */}
              <div>
                <label className="text-xs font-bold text-industrial-text uppercase tracking-wide mb-3 block">Priority</label>
                <div className="flex flex-wrap gap-2">
                  {PRIORITY_OPTIONS.map(priority => (
                    <button
                      key={priority}
                      onClick={() => {
                        const current = filter.priority || []
                        const newValue = current.includes(priority)
                          ? current.filter(p => p !== priority)
                          : [...current, priority]
                        updateFilter('priority', newValue.length ? newValue.join(',') : null)
                      }}
                      className={clsx(
                        'px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-all',
                        filter.priority?.includes(priority)
                          ? 'bg-industrial-accent text-industrial-accent-foreground shadow-neu-button'
                          : 'bg-industrial-background text-industrial-text shadow-neu-card hover:shadow-neu-floating'
                      )}
                    >
                      P{priority}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Ready Filter */}
              <div>
                <label className="text-xs font-bold text-industrial-text uppercase tracking-wide mb-3 block">Ready Work</label>
                <button
                  onClick={() => updateFilter('ready', filter.ready ? null : 'true')}
                  className={clsx(
                    'px-4 py-2 rounded text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2',
                    filter.ready
                      ? 'bg-industrial-accent text-industrial-accent-foreground shadow-neu-button'
                      : 'bg-industrial-background text-industrial-text shadow-neu-card hover:shadow-neu-floating'
                  )}
                >
                  <Zap size={14} strokeWidth={2} className={filter.ready ? 'fill-current' : ''} />
                  Ready
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* List */}
      <div className="flex-1 overflow-auto bg-industrial-background">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-industrial-accent border-t-transparent rounded-full" />
          </div>
        ) : data?.beads?.length ? (
          <div className="p-2 max-w-7xl mx-auto">
            {data.beads.map((bead, index) => (
              <BeadRow
                key={bead.id}
                bead={bead}
                selected={index === selectedIndex}
                onClick={() => setSelectedBead(bead.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-industrial-text-muted">
            <FilterIcon size={48} className="mb-4 opacity-20" strokeWidth={2} />
            <p className="text-sm font-medium">No beads match your filters</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-4 px-6 py-2 rounded-lg bg-industrial-accent text-industrial-accent-foreground shadow-neu-button hover:brightness-110 transition-all text-sm font-bold uppercase tracking-wide">
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {data?.hasMore && (
        <div className="p-4 border-t border-industrial-border bg-industrial-background text-center">
          <span className="text-sm font-semibold text-industrial-text-muted">
            Showing {data.beads.length} of {data.total} results
          </span>
        </div>
      )}
      
      {/* Detail Modal */}
      {selectedBead && (
        <BeadDetail beadId={selectedBead} onClose={() => setSelectedBead(null)} />
      )}
    </div>
  )
}
