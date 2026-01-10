// Bead types matching the Go backend
export type Status = 
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'deferred'
  | 'closed'
  | 'tombstone'
  | 'pinned'
  | 'hooked'

export type BeadType =
  | 'task'
  | 'bug'
  | 'feature'
  | 'epic'
  | 'chore'
  | 'message'
  | 'merge-request'
  | 'molecule'
  | 'gate'
  | 'event'

export interface Dependency {
  issue_id: string
  depends_on_id: string
  type: string
  created_at: string
}

export interface Comment {
  id: number
  issue_id: string
  author: string
  text: string
  created_at: string
}

export interface Bead {
  id: string
  title: string
  description?: string
  status: Status
  priority: number
  issue_type: BeadType
  assignee?: string
  labels?: string[]
  dependencies?: Dependency[]
  comments?: Comment[]
  created_at: string
  updated_at: string
  closed_at?: string
  due_at?: string
  defer_until?: string
  // Graph relationships
  ParentID?: string
  Children?: Bead[]
  Blockers?: Bead[]
  Blocked?: Bead[]
}

export interface Stats {
  total: number
  byStatus: Record<string, number>
  byType: Record<string, number>
  byPriority: Record<string, number>
  blocked: number
  ready: number
  stale: number
  velocity: {
    created_7d: number
    closed_7d: number
  }
}

export interface BeadsResponse {
  beads: Bead[]
  total: number
  hasMore: boolean
}

export interface BeadDetailResponse {
  bead: Bead
  children?: Bead[]
  blockers?: Bead[]
  blocked?: Bead[]
  parent?: Bead
}

export interface EpicProgress {
  id: string
  title: string
  status: Status
  totalChildren: number
  closedChildren: number
}

export interface Filter {
  status?: Status[]
  type?: BeadType[]
  priority?: number[]
  labels?: string[]
  search?: string
  ready?: boolean
  limit?: number
  offset?: number
}

// Utility types
export const STATUS_LABELS: Record<Status, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  deferred: 'Deferred',
  closed: 'Closed',
  tombstone: 'Deleted',
  pinned: 'Pinned',
  hooked: 'Hooked',
}

export const TYPE_LABELS: Record<BeadType, string> = {
  task: 'Task',
  bug: 'Bug',
  feature: 'Feature',
  epic: 'Epic',
  chore: 'Chore',
  message: 'Message',
  'merge-request': 'Merge Request',
  molecule: 'Molecule',
  gate: 'Gate',
  event: 'Event',
}

export const PRIORITY_LABELS: Record<number, string> = {
  0: 'P0 - Critical',
  1: 'P1 - High',
  2: 'P2 - Medium',
  3: 'P3 - Low',
  4: 'P4 - Lowest',
}
