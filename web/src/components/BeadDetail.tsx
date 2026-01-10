import { useQuery } from '@tanstack/react-query'
import { getBead } from '../api/client'
import { STATUS_LABELS, TYPE_LABELS, Bead } from '../types'
import { X, Copy, Terminal, Link2, Clock, User, Tag, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import ReactMarkdown from 'react-markdown'

interface BeadDetailProps {
  beadId: string
  onClose: () => void
}

export default function BeadDetail({ beadId, onClose }: BeadDetailProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bead', beadId],
    queryFn: () => getBead(beadId),
  })
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-industrial-text/20 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-industrial-background rounded-xl p-8 shadow-neu-floating corner-screws">
          <div className="animate-spin w-8 h-8 border-2 border-industrial-accent border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }
  
  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-industrial-text/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-industrial-background rounded-xl p-8 text-center shadow-neu-floating corner-screws">
          <AlertTriangle className="w-12 h-12 text-industrial-accent mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-industrial-text-muted font-medium text-sm">Failed to load bead</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-industrial-background rounded-lg shadow-neu-card hover:shadow-neu-pressed active:translate-y-[2px] transition-all font-medium text-sm">Close</button>
        </div>
      </div>
    )
  }
  
  const { bead, children, blockers, blocked, parent } = data
  
  // Badge color mappings matching BeadRow - Nature-Inspired Palette
  const getStatusBadgeClasses = (status: string) => {
    const map: Record<string, string> = {
      open: 'bg-sky-50 text-sky-700 border border-sky-200',
      in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
      closed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      blocked: 'bg-rose-50 text-rose-700 border border-rose-200',
      deferred: 'bg-stone-50 text-stone-500 border border-stone-200',
    }
    return map[status] || 'bg-stone-50 text-stone-700 border border-stone-200'
  }
  
  const getTypeBadgeClasses = (type: string) => {
    const map: Record<string, string> = {
      task: 'bg-stone-100 text-stone-700 border border-stone-200',
      bug: 'bg-rose-100 text-rose-700 border border-rose-200',
      feature: 'bg-sky-100 text-sky-700 border border-sky-200',
      epic: 'bg-violet-100 text-violet-700 border border-violet-200',
      chore: 'bg-amber-100 text-amber-700 border border-amber-200',
    }
    return map[type] || 'bg-stone-100 text-stone-700 border border-stone-200'
  }
  
  const getPriorityBadgeClasses = (priority: number) => {
    const map: Record<number, string> = {
      0: 'bg-rose-500 text-white shadow-sm shadow-rose-200',
      1: 'bg-orange-100 text-orange-800 border border-orange-200',
      2: 'bg-amber-100 text-amber-800 border border-amber-200',
      3: 'bg-stone-100 text-stone-600 border border-stone-200',
      4: 'bg-stone-50 text-stone-400',
    }
    return map[priority] || 'bg-stone-100 text-stone-600 border border-stone-200'
  }
  
  return (
    <div className="fixed inset-0 bg-industrial-text/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-industrial-background rounded-2xl shadow-neu-floating w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-enter corner-screws"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Bolted Panel */}
        <div className="flex items-start justify-between p-8 border-b border-industrial-border">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-industrial-text font-bold text-sm">{bead.id}</span>
              <span className={clsx(
                'px-3 py-1 rounded text-xs font-bold uppercase tracking-wide',
                getStatusBadgeClasses(bead.status)
              )}>
                {STATUS_LABELS[bead.status]}
              </span>
              <span className={clsx(
                'px-3 py-1 rounded text-xs font-bold uppercase tracking-wide',
                getTypeBadgeClasses(bead.issue_type)
              )}>
                {TYPE_LABELS[bead.issue_type]}
              </span>
              <span className={clsx(
                'px-3 py-1 rounded text-xs font-mono font-bold uppercase',
                getPriorityBadgeClasses(bead.priority),
                bead.priority === 0 && 'animate-pulse'
              )}>
                P{bead.priority}
              </span>
            </div>
            <h2 className="text-xl text-industrial-text leading-tight font-semibold">{bead.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-industrial-background shadow-neu-card hover:shadow-neu-pressed active:translate-y-[2px] transition-all">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {/* Description */}
          {bead.description && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide text-industrial-text mb-3 flex items-center gap-2">
                Description
              </h3>
              <div className="prose prose-sm max-w-none text-industrial-text-muted text-sm leading-relaxed">
                <ReactMarkdown>{bead.description}</ReactMarkdown>
              </div>
            </div>
          )}
          
          {/* Metadata Grid - Industrial Panel */}
          <div className="grid grid-cols-2 gap-4 mb-8 bg-industrial-muted/50 p-6 rounded-lg shadow-neu-recessed">
            {bead.assignee && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-9 h-9 rounded-lg bg-industrial-background shadow-neu-card flex items-center justify-center text-industrial-text">
                  <User size={16} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-xs text-industrial-text-muted font-medium uppercase tracking-wide">Assignee</div>
                  <div className="font-semibold text-sm text-industrial-text">{bead.assignee}</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <div className="w-9 h-9 rounded-lg bg-industrial-background shadow-neu-card flex items-center justify-center text-industrial-text">
                <Clock size={16} strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-xs text-industrial-text-muted font-medium uppercase tracking-wide">Created</div>
                <div className="font-semibold text-sm text-industrial-text">{new Date(bead.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-9 h-9 rounded-lg bg-industrial-background shadow-neu-card flex items-center justify-center text-industrial-text">
                <Clock size={16} strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-xs text-industrial-text-muted font-medium uppercase tracking-wide">Updated</div>
                <div className="font-semibold text-sm text-industrial-text">{new Date(bead.updated_at).toLocaleDateString()}</div>
              </div>
            </div>
            {bead.closed_at && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-9 h-9 rounded-lg bg-green-600 shadow-neu-sharp flex items-center justify-center text-white">
                  <Clock size={16} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-xs text-industrial-text-muted font-medium uppercase tracking-wide">Closed</div>
                  <div className="font-semibold text-sm text-industrial-text">{new Date(bead.closed_at).toLocaleDateString()}</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Labels */}
          {bead.labels && bead.labels.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide text-industrial-text mb-3 flex items-center gap-2">
                <Tag size={16} strokeWidth={1.5} />
                Labels
              </h3>
              <div className="flex flex-wrap gap-2">
                {bead.labels.map(label => (
                  <span key={label} className="px-3 py-1 rounded bg-industrial-muted text-industrial-text-muted text-xs font-mono shadow-neu-recessed uppercase tracking-wide">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Parent */}
          {parent && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide text-industrial-text mb-3 flex items-center gap-2">
                <Link2 size={16} strokeWidth={1.5} />
                Parent
              </h3>
              <RelatedBeadCard bead={parent} />
            </div>
          )}
          
          {/* Blockers */}
          {blockers && blockers.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide text-industrial-accent mb-3 flex items-center gap-2">
                <AlertTriangle size={16} strokeWidth={1.5} />
                Blocked By ({blockers.length})
              </h3>
              <div className="space-y-2">
                {blockers.map(b => (
                  <RelatedBeadCard key={b.id} bead={b} />
                ))}
              </div>
            </div>
          )}
          
          {/* Blocking */}
          {blocked && blocked.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide text-industrial-text-muted mb-3">Blocking ({blocked.length})</h3>
              <div className="space-y-2">
                {blocked.map(b => (
                  <RelatedBeadCard key={b.id} bead={b} />
                ))}
              </div>
            </div>
          )}
          
          {/* Children */}
          {children && children.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide text-industrial-text-muted mb-3">Children ({children.length})</h3>
              <div className="space-y-2">
                {children.map(b => (
                  <RelatedBeadCard key={b.id} bead={b} />
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer - Action Buttons */}
        <div className="flex items-center gap-3 p-6 border-t border-industrial-border bg-industrial-muted/30">
          <button
            onClick={() => copyToClipboard(bead.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-industrial-background text-industrial-text shadow-neu-card hover:shadow-neu-floating transition-all text-sm font-medium"
          >
            <Copy size={16} strokeWidth={1.5} />
            Copy ID
          </button>
          <button
            onClick={() => copyToClipboard(`bd show ${bead.id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-industrial-background text-industrial-text shadow-neu-card hover:shadow-neu-floating transition-all text-sm font-medium"
          >
            <Terminal size={16} strokeWidth={1.5} />
            bd show
          </button>
          {bead.status !== 'closed' && (
            <button
              onClick={() => copyToClipboard(`bd update ${bead.id} -s closed`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-industrial-accent text-industrial-accent-foreground shadow-neu-button hover:brightness-110 transition-all text-sm font-bold ml-auto"
            >
              <Terminal size={16} strokeWidth={1.5} />
              bd close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function RelatedBeadCard({ bead }: { bead: Bead }) {
  const getStatusClasses = (status: string) => {
    const map: Record<string, string> = {
      open: 'bg-industrial-background text-industrial-text shadow-neu-recessed',
      in_progress: 'bg-industrial-accent text-industrial-accent-foreground shadow-neu-button',
      closed: 'bg-green-600 text-white shadow-neu-sharp',
      blocked: 'bg-industrial-accent text-industrial-accent-foreground shadow-neu-button',
    }
    return map[status] || 'bg-industrial-background text-industrial-text shadow-neu-recessed'
  }
  
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-industrial-muted/30 shadow-neu-recessed hover:shadow-neu-card transition-all cursor-pointer group">
      <span className="font-mono text-xs text-industrial-text font-bold">{bead.id}</span>
      <span className={clsx(
        'px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide',
        getStatusClasses(bead.status)
      )}>
        {bead.status}
      </span>
      <span className="truncate text-sm font-medium text-industrial-text">{bead.title}</span>
    </div>
  )
}
