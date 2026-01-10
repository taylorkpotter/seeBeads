import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getEpics } from '../api/client'
import BeadDetail from '../components/BeadDetail'
import { ChevronRight, ChevronDown, Layers, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'
import { Bead } from '../types'

export default function Epics() {
  const [selectedBead, setSelectedBead] = useState<string | null>(null)
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set())
  
  const { data: epicsData, isLoading } = useQuery({
    queryKey: ['epics'],
    queryFn: getEpics,
  })
  
  const toggleExpanded = (id: string) => {
    setExpandedEpics(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-industrial-accent border-t-transparent rounded-full" />
      </div>
    )
  }
  
  const epics = epicsData?.epics || []
  
  return (
    <div className="p-8 bg-industrial-background min-h-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="p-2 rounded-lg bg-industrial-muted shadow-neu-recessed">
            <Layers size={24} strokeWidth={2} className="text-industrial-text" />
          </div>
          Epics
        </h1>
        <span className="text-sm font-semibold text-industrial-text-muted">{epics.length} epics</span>
      </div>
      
      {epics.length === 0 ? (
        <div className="text-center py-16 text-industrial-text-muted">
          <Layers size={48} strokeWidth={2} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">No epics found</p>
          <p className="text-sm mt-2">Create an epic with <code className="bg-industrial-muted px-2 py-1 rounded shadow-neu-recessed font-mono">bd create -t epic "Epic title"</code></p>
        </div>
      ) : (
        <div className="space-y-4">
          {epics.map(epic => (
            <EpicCard
              key={epic.id}
              epic={epic}
              expanded={expandedEpics.has(epic.id)}
              onToggle={() => toggleExpanded(epic.id)}
              onSelectBead={setSelectedBead}
            />
          ))}
        </div>
      )}
      
      {selectedBead && (
        <BeadDetail beadId={selectedBead} onClose={() => setSelectedBead(null)} />
      )}
    </div>
  )
}

interface EpicCardProps {
  epic: {
    id: string
    title: string
    status: string
    totalChildren: number
    closedChildren: number
  }
  expanded: boolean
  onToggle: () => void
  onSelectBead: (id: string) => void
}

function EpicCard({ epic, expanded, onToggle, onSelectBead }: EpicCardProps) {
  const progress = epic.totalChildren > 0 
    ? Math.round((epic.closedChildren / epic.totalChildren) * 100)
    : 0
  
  // Fetch children when expanded
  const { data: childrenData } = useQuery({
    queryKey: ['bead', epic.id],
    queryFn: () => fetch(`/api/beads/${epic.id}`).then(r => r.json()),
    enabled: expanded,
  })
  
  const children = childrenData?.children || []
  
  return (
    <div className="bg-industrial-background rounded-2xl shadow-neu-floating overflow-hidden corner-screws">
      {/* Epic Header */}
      <div 
        className="flex items-center gap-4 p-6 cursor-pointer hover:bg-industrial-muted/30 transition-colors"
        onClick={onToggle}
      >
        <button className="text-industrial-text-muted hover:text-industrial-text">
          {expanded ? <ChevronDown size={20} strokeWidth={2} /> : <ChevronRight size={20} strokeWidth={2} />}
        </button>
        
        <span className="font-mono text-sm font-bold text-industrial-text">{epic.id}</span>
        
        <span className={clsx(
          'px-3 py-1 rounded text-xs font-bold',
          epic.status === 'open' && 'bg-industrial-background text-industrial-text shadow-neu-recessed',
          epic.status === 'in_progress' && 'bg-industrial-accent text-industrial-accent-foreground shadow-neu-button',
          epic.status === 'closed' && 'bg-green-600 text-white shadow-neu-sharp',
        )}>
          {epic.status}
        </span>
        
        <span className="font-semibold flex-1 text-industrial-text">{epic.title}</span>
        
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="w-32 h-3 bg-industrial-muted rounded-full overflow-hidden shadow-neu-recessed">
            <div 
              className="h-full bg-green-600 transition-all duration-300 shadow-neu-glow-success"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-bold text-industrial-text-muted w-24 text-right font-mono">
            {epic.closedChildren}/{epic.totalChildren} ({progress}%)
          </span>
        </div>
      </div>
      
      {/* Children */}
      {expanded && (
        <div className="border-t border-industrial-border bg-industrial-muted/20">
          {children.length > 0 ? (
            <div className="divide-y divide-industrial-border/30">
              {children.map((child: Bead) => (
                <div
                  key={child.id}
                  className="flex items-center gap-4 p-4 pl-16 hover:bg-industrial-muted/30 cursor-pointer transition-colors"
                  onClick={() => onSelectBead(child.id)}
                >
                  <span className="font-mono text-sm font-medium text-industrial-text-muted">{child.id}</span>
                  
                  {child.status === 'closed' ? (
                    <CheckCircle2 size={16} strokeWidth={2} className="text-green-600" />
                  ) : (
                    <div className={clsx(
                      'w-4 h-4 rounded-full border-2',
                      child.status === 'in_progress' && 'border-industrial-accent',
                      child.status === 'blocked' && 'border-industrial-accent',
                      child.status === 'open' && 'border-industrial-text-muted',
                    )} />
                  )}
                  
                  <span className="flex-1 font-medium text-industrial-text">{child.title}</span>
                  
                  <span className={clsx(
                    'px-3 py-1 rounded text-xs font-bold',
                    child.status === 'open' && 'bg-industrial-background text-industrial-text shadow-neu-recessed',
                    child.status === 'in_progress' && 'bg-industrial-accent text-industrial-accent-foreground shadow-neu-button',
                    child.status === 'closed' && 'bg-green-600 text-white shadow-neu-sharp',
                    child.status === 'blocked' && 'bg-industrial-accent text-industrial-accent-foreground shadow-neu-button',
                  )}>
                    {child.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 pl-16 text-sm text-industrial-text-muted font-medium">
              No child issues
            </div>
          )}
        </div>
      )}
    </div>
  )
}
