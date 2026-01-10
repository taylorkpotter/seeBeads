import { Bead, STATUS_LABELS, TYPE_LABELS } from '../types'
import { clsx } from 'clsx'
import { 
  Circle, 
  PlayCircle, 
  CheckCircle2, 
  XCircle,
  PauseCircle,
  AlertCircle,
} from 'lucide-react'

interface BeadRowProps {
  bead: Bead
  onClick?: () => void
  selected?: boolean
}

const statusIcons = {
  open: Circle,
  in_progress: PlayCircle,
  closed: CheckCircle2,
  blocked: XCircle,
  deferred: PauseCircle,
  tombstone: XCircle,
  pinned: AlertCircle,
  hooked: PlayCircle,
}

const statusColors = {
  open: 'text-muted-foreground',
  in_progress: 'text-secondary',
  closed: 'text-primary',
  blocked: 'text-destructive',
  deferred: 'text-muted-foreground',
  tombstone: 'text-muted-foreground',
  pinned: 'text-primary',
  hooked: 'text-secondary',
}

// Cohesive Nature-Inspired Palette
// Distinct but harmonious with the warm background
const typeColors: Record<string, string> = {
  task: 'bg-stone-100 text-stone-700 border border-stone-200',     // Pebble
  bug: 'bg-rose-100 text-rose-700 border border-rose-200',          // Berry
  feature: 'bg-sky-100 text-sky-700 border border-sky-200',         // Sky
  epic: 'bg-violet-100 text-violet-700 border border-violet-200',   // Lavender
  chore: 'bg-amber-100 text-amber-700 border border-amber-200',     // Sand
  message: 'bg-teal-100 text-teal-700 border border-teal-200',      // Ocean
  'merge-request': 'bg-indigo-100 text-indigo-700 border border-indigo-200', // Deep Water
  molecule: 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200', // Flower
  gate: 'bg-orange-100 text-orange-700 border border-orange-200',   // Clay
  event: 'bg-lime-100 text-lime-700 border border-lime-200',        // Leaf
}

// Priority colors - Warm gradients
const priorityColors: Record<number, string> = {
  0: 'bg-rose-500 text-white shadow-sm shadow-rose-200',            // Urgent (Rose)
  1: 'bg-orange-100 text-orange-800 border border-orange-200',      // High (Clay)
  2: 'bg-amber-100 text-amber-800 border border-amber-200',         // Medium (Sand)
  3: 'bg-stone-100 text-stone-600 border border-stone-200',         // Low (Stone)
  4: 'bg-stone-50 text-stone-400',                                  // None (Mist)
}

// Status badge colors - Nature states
const statusBadgeColors: Record<string, string> = {
  open: 'bg-sky-50 text-sky-700 border border-sky-200',            // Blue (Open)
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',// Amber (In Progress/Active)
  closed: 'bg-emerald-50 text-emerald-700 border border-emerald-200', // Green (Closed)
  blocked: 'bg-rose-50 text-rose-700 border border-rose-200',       // Rose (Blocked)
  deferred: 'bg-stone-50 text-stone-500 border border-stone-200',   // Stone
  tombstone: 'bg-stone-50 text-stone-400',
  pinned: 'bg-violet-50 text-violet-700 border border-violet-200',
  hooked: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
}

export default function BeadRow({ bead, onClick, selected }: BeadRowProps) {
  const StatusIcon = statusIcons[bead.status] || Circle
  
  return (
    <div
      className={clsx(
        'group flex items-center gap-4 px-6 py-4 mx-2 my-2 rounded-[2rem] transition-all duration-300 cursor-pointer organic-card',
        selected && 'shadow-lift'
      )}
      onClick={onClick}
    >
      {/* Status Icon */}
      <div className={clsx(statusColors[bead.status], "transition-transform group-hover:scale-110 duration-300 shrink-0")}>
        <StatusIcon size={20} strokeWidth={2} />
      </div>
      
      {/* Type Badge */}
      <span className={clsx(
        'px-4 py-1.5 rounded-full text-xs font-bold shrink-0',
        typeColors[bead.issue_type] || 'bg-muted text-foreground'
      )}>
        {TYPE_LABELS[bead.issue_type] || bead.issue_type}
      </span>
      
      {/* ID */}
      <span className="font-mono text-sm text-muted-foreground w-24 shrink-0">
        {bead.id}
      </span>
      
      {/* Title */}
      <span className="flex-1 truncate font-medium min-w-[100px]">
        {bead.title}
      </span>
      
      {/* Labels */}
      {bead.labels && bead.labels.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          {bead.labels.slice(0, 2).map(label => (
            <span key={label} className="px-3 py-1 rounded-full text-xs font-mono bg-stone-100 text-stone-600 border border-stone-200">
              {label}
            </span>
          ))}
          {bead.labels.length > 2 && (
            <span className="text-xs text-muted-foreground">+{bead.labels.length - 2}</span>
          )}
        </div>
      )}
      
      {/* Status Badge */}
      <span className={clsx(
        'px-4 py-1.5 rounded-full text-xs font-bold shrink-0',
        statusBadgeColors[bead.status] || 'bg-muted text-foreground'
      )}>
        {STATUS_LABELS[bead.status]}
      </span>
      
      {/* Priority */}
      <span className={clsx(
        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
        priorityColors[bead.priority] || 'bg-muted text-foreground'
      )}>
        P{bead.priority}
      </span>
      
      {/* Assignee */}
      <div className="w-24 text-right truncate text-sm text-muted-foreground shrink-0">
        {bead.assignee || '-'}
      </div>
    </div>
  )
}
