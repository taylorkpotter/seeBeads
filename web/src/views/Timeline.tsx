import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getBeads } from '../api/client'
import { Bead, STATUS_LABELS, TYPE_LABELS } from '../types'
import BeadDetail from '../components/BeadDetail'
import { Clock, Circle, CheckCircle2, PlayCircle, XCircle, Calendar } from 'lucide-react'
import { clsx } from 'clsx'

type TimeRange = '24h' | '7d' | '30d' | 'all'

export default function Timeline() {
  const [selectedBead, setSelectedBead] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  
  const { data, isLoading } = useQuery({
    queryKey: ['beads-timeline'],
    queryFn: () => getBeads({ limit: 200 }),
  })
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-industrial-accent border-t-transparent rounded-full" />
      </div>
    )
  }
  
  const beads = data?.beads || []
  
  // Filter by time range
  const now = new Date()
  const filteredBeads = beads.filter(bead => {
    const created = new Date(bead.created_at)
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
    
    switch (timeRange) {
      case '24h':
        return diffHours <= 24
      case '7d':
        return diffHours <= 24 * 7
      case '30d':
        return diffHours <= 24 * 30
      default:
        return true
    }
  })
  
  // Group by date
  const groupedByDate = filteredBeads.reduce((acc, bead) => {
    const date = new Date(bead.created_at).toLocaleDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(bead)
    return acc
  }, {} as Record<string, Bead[]>)
  
  // Sort dates (most recent first)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime()
  })
  
  return (
    <div className="h-full flex flex-col bg-industrial-background">
      {/* Toolbar */}
      <div className="p-6 border-b border-industrial-border-dark bg-industrial-background shadow-neu-card flex items-center gap-4">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Clock size={20} strokeWidth={2} className="text-industrial-text" />
          Timeline
        </h1>
        
        <div className="flex-1" />
        
        {/* Time Range Filter */}
        <div className="flex items-center gap-2 bg-industrial-muted rounded-lg p-1 shadow-neu-recessed">
          {(['24h', '7d', '30d', 'all'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={clsx(
                'px-3 py-1.5 rounded text-sm font-bold transition-all',
                timeRange === range
                  ? 'bg-industrial-accent text-industrial-accent-foreground shadow-neu-sharp'
                  : 'text-industrial-text-muted hover:text-industrial-text'
              )}
            >
              {range === 'all' ? 'All' : range === '24h' ? '24h' : range === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
        
        <span className="text-sm font-semibold text-industrial-text-muted">
          {filteredBeads.length} events
        </span>
      </div>
      
      {/* Timeline */}
      <div className="flex-1 overflow-auto p-6">
        {sortedDates.length === 0 ? (
          <div className="text-center py-16 text-industrial-text-muted">
            <Clock size={48} className="mx-auto mb-4 opacity-50" strokeWidth={2} />
            <p className="font-medium">No activity in this time range</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {sortedDates.map(date => (
              <div key={date} className="mb-8">
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4">
                  <Calendar size={16} strokeWidth={2} className="text-industrial-text-muted" />
                  <span className="text-sm font-bold text-industrial-text-muted">
                    {formatDateHeader(date)}
                  </span>
                  <div className="flex-1 h-px bg-industrial-border" />
                </div>
                
                {/* Events */}
                <div className="relative pl-6 border-l-2 border-industrial-border">
                  {groupedByDate[date]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(bead => (
                      <TimelineEvent
                        key={bead.id}
                        bead={bead}
                        onClick={() => setSelectedBead(bead.id)}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {selectedBead && (
        <BeadDetail beadId={selectedBead} onClose={() => setSelectedBead(null)} />
      )}
    </div>
  )
}

interface TimelineEventProps {
  bead: Bead
  onClick: () => void
}

function TimelineEvent({ bead, onClick }: TimelineEventProps) {
  const statusIcons = {
    open: Circle,
    in_progress: PlayCircle,
    closed: CheckCircle2,
    blocked: XCircle,
  }
  
  const statusColors = {
    open: 'text-industrial-text bg-industrial-muted',
    in_progress: 'text-industrial-accent bg-industrial-accent/20',
    closed: 'text-green-600 bg-green-600/20',
    blocked: 'text-industrial-accent bg-industrial-accent/20',
  }
  
  const Icon = statusIcons[bead.status as keyof typeof statusIcons] || Circle
  const colorClass = statusColors[bead.status as keyof typeof statusColors] || 'text-industrial-text-muted bg-industrial-muted'
  
  return (
    <div 
      className="relative mb-4 cursor-pointer group"
      onClick={onClick}
    >
      {/* Dot */}
      <div className={clsx(
        'absolute -left-[25px] w-4 h-4 rounded-full flex items-center justify-center shadow-neu-recessed',
        colorClass.split(' ')[1]
      )}>
        <div className={clsx('w-2 h-2 rounded-full', colorClass.split(' ')[0].replace('text-', 'bg-'))} />
      </div>
      
      {/* Card */}
      <div className="bg-industrial-background rounded-xl p-4 shadow-neu-card group-hover:shadow-neu-floating transition-all">
        <div className="flex items-start gap-3">
          <Icon size={18} strokeWidth={2} className={colorClass.split(' ')[0]} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-industrial-text">{bead.id}</span>
              <span className={clsx(
                'px-2 py-0.5 rounded text-xs font-bold',
                colorClass
              )}>
                {STATUS_LABELS[bead.status]}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-industrial-muted text-industrial-text-muted shadow-neu-recessed font-bold">
                {TYPE_LABELS[bead.issue_type]}
              </span>
            </div>
            
            <h4 className="font-semibold truncate text-industrial-text">{bead.title}</h4>
            
            <div className="flex items-center gap-4 mt-2 text-xs text-industrial-text-muted font-medium">
              <span>{formatTime(bead.created_at)}</span>
              {bead.assignee && <span>@{bead.assignee}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
