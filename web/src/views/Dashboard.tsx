import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getStats, getBeads } from '../api/client'
import { useSSE } from '../hooks/useSSE'
import StatCard from '../components/StatCard'
import BeadRow from '../components/BeadRow'
import BeadDetail from '../components/BeadDetail'
import EmptyState from '../components/EmptyState'
import { useState } from 'react'
import { 
  Circle, 
  PlayCircle, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Zap,
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export default function Dashboard() {
  const navigate = useNavigate()
  const { stats: sseStats } = useSSE()
  const [selectedBead, setSelectedBead] = useState<string | null>(null)
  
  // Use SSE stats if available, otherwise fetch
  const { data: fetchedStats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    enabled: !sseStats,
  })
  
  const stats = sseStats || fetchedStats
  
  // Fetch recent activity
  const { data: recentData } = useQuery({
    queryKey: ['recent-beads'],
    queryFn: () => getBeads({ limit: 5 }),
  })

  // Fetch all open beads to calculate "Open Issues By Type"
  const { data: openBeadsData } = useQuery({
    queryKey: ['open-beads-all'],
    queryFn: () => getBeads({ status: ['open', 'in_progress', 'blocked'] }),
  })
  
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-industrial-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  // Check if there are any beads at all
  const totalBeads = Object.values(stats.byStatus || {}).reduce((sum, count) => sum + count, 0)
  
  // Show empty state when no beads exist
  if (totalBeads === 0) {
    return <EmptyState />
  }
  
  const statusData = Object.entries(stats.byStatus || {}).map(([key, value]) => ({
    name: key,
    value,
  }))
  
  // Calculate Open Issues By Type
  const openTypeCounts: Record<string, number> = {}
  if (openBeadsData?.beads) {
    openBeadsData.beads.forEach(bead => {
      openTypeCounts[bead.issue_type] = (openTypeCounts[bead.issue_type] || 0) + 1
    })
  }

  const openTypeData = Object.entries(openTypeCounts).map(([key, value]) => ({
    name: key,
    value,
  }))
  
  // Explicit colors map
  const STATUS_COLORS: Record<string, string> = {
    open: '#0ea5e9',        // Sky (Blue)
    in_progress: '#f59e0b', // Amber (Yellow/Orange)
    closed: '#10b981',      // Emerald (Green)
    blocked: '#f43f5e',     // Rose (Red)
    ready: '#14b8a6',       // Teal
    deferred: '#78716c',    // Stone
    tombstone: '#78716c',
  }

  const TYPE_COLORS: Record<string, string> = {
    bug: '#f43f5e',         // Rose
    feature: '#0ea5e9',     // Sky
    epic: '#8b5cf6',        // Violet
    task: '#78716c',        // Stone
    chore: '#f59e0b',       // Amber
  }
  
  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-enter">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Open"
          value={stats.byStatus?.open || 0}
          icon={<Circle size={20} strokeWidth={2} />}
          color="blue"
          onClick={() => navigate('/issues?status=open')}
        />
        <StatCard
          label="In Progress"
          value={stats.byStatus?.in_progress || 0}
          icon={<PlayCircle size={20} strokeWidth={2} />}
          color="yellow"
          onClick={() => navigate('/issues?status=in_progress')}
        />
        <StatCard
          label="Closed"
          value={stats.byStatus?.closed || 0}
          icon={<CheckCircle2 size={20} strokeWidth={2} />}
          color="green"
          onClick={() => navigate('/issues?status=closed')}
        />
        <StatCard
          label="Blocked"
          value={stats.blocked || 0}
          icon={<XCircle size={20} strokeWidth={2} />}
          color="red"
          onClick={() => navigate('/issues?status=blocked')}
        />
        <StatCard
          label="Ready"
          value={stats.ready || 0}
          icon={<Zap size={20} strokeWidth={2} />}
          color="purple"
          onClick={() => navigate('/issues?ready=true')}
        />
        <StatCard
          label="Stale"
          value={stats.stale || 0}
          icon={<Clock size={20} strokeWidth={2} />}
          color="gray"
        />
      </div>
      
      {/* Velocity Panel - HIDDEN (Code saved for later)
      {stats.velocity && (
        <div className="bg-industrial-background rounded-2xl p-8 shadow-neu-floating corner-screws">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg shadow-neu-recessed bg-industrial-muted">
              <TrendingUp size={20} className="text-industrial-text" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-industrial-text">7 Day Velocity</h3>
          </div>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-black text-industrial-text mb-1 font-mono tracking-tight">
                +{stats.velocity.created_7d}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-industrial-text-muted">created</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-green-600 mb-1 font-mono tracking-tight">
                -{stats.velocity.closed_7d}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-industrial-text-muted">closed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-industrial-text mb-1 font-mono tracking-tight">
                {stats.velocity.created_7d - stats.velocity.closed_7d > 0 ? '+' : ''}
                {stats.velocity.created_7d - stats.velocity.closed_7d}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-industrial-text-muted">net</div>
            </div>
          </div>
        </div>
      )}
      */}

      {/* Lists Row - MOVED ABOVE CHARTS */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent Activity */}
        <div className="bg-industrial-background rounded-2xl shadow-neu-floating overflow-hidden flex flex-col corner-screws">
          <div className="flex items-center justify-between p-6 pb-4 border-b border-industrial-border">
            <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-3 text-industrial-text">
              <div className="p-2 rounded-lg shadow-neu-recessed bg-industrial-muted">
                <Clock size={18} strokeWidth={2} />
              </div>
              Recent Activity
              <div className="led-indicator bg-green-500" />
            </h3>
            <button 
              onClick={() => navigate('/timeline')}
              className="px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide text-industrial-text bg-industrial-background shadow-neu-card hover:shadow-neu-floating transition-all"
            >
              View all
            </button>
          </div>
          <div className="p-4 space-y-1">
            {recentData?.beads?.length ? (
              recentData.beads.map(bead => (
                <BeadRow 
                  key={bead.id} 
                  bead={bead} 
                  onClick={() => setSelectedBead(bead.id)}
                />
              ))
            ) : (
              <div className="p-12 text-center text-industrial-text-muted text-sm font-medium">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-industrial-background rounded-2xl p-8 shadow-neu-floating corner-screws">
          <h3 className="text-sm font-bold uppercase tracking-wide text-industrial-text mb-6">Status Distribution</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#94a3b8'} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#e0e5ec', 
                    border: '1px solid #babecc',
                    borderRadius: '8px',
                    color: '#2d3436',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 600,
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4 flex-wrap">
            {statusData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name] || '#94a3b8' }} />
                <span className="text-xs font-bold uppercase text-industrial-text-muted">
                  {entry.name} <span className="text-industrial-text ml-1">{entry.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Type Distribution - OPEN ONLY */}
        <div className="bg-industrial-background rounded-2xl p-8 shadow-neu-floating corner-screws">
          <h3 className="text-sm font-bold uppercase tracking-wide text-industrial-text mb-6">Open Issues By Type</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={openTypeData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100}
                  tick={{ fill: '#4a5568', fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#e0e5ec', 
                    border: '1px solid #babecc',
                    borderRadius: '8px',
                    color: '#2d3436',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 600,
                  }} 
                  cursor={{ fill: 'rgba(14, 165, 233, 0.05)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                  {openTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Bead Detail Modal */}
      {selectedBead && (
        <BeadDetail beadId={selectedBead} onClose={() => setSelectedBead(null)} />
      )}
    </div>
  )
}
