import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface StatCardProps {
  label: string
  value: number | string
  icon?: ReactNode
  delta?: number
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'
  onClick?: () => void
}

const colorClasses = {
  blue: 'text-primary',
  green: 'text-primary',
  yellow: 'text-secondary',
  red: 'text-destructive',
  purple: 'text-secondary',
  gray: 'text-muted-foreground',
}

export default function StatCard({ 
  label, 
  value, 
  icon,
  delta,
  color = 'blue',
  onClick 
}: StatCardProps) {
  return (
    <div
      className={clsx(
        'p-8 organic-card transition-all duration-300 relative',
        colorClasses[color],
        onClick && 'cursor-pointer hover:-translate-y-1'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-6xl font-display font-bold text-depth">{value}</div>
          <div className="text-sm text-muted-foreground mt-2 font-medium">{label}</div>
        </div>
        {icon && (
          <div className="rounded-2xl bg-primary/10 p-4 text-primary">
            {icon}
          </div>
        )}
      </div>
      {delta !== undefined && delta !== 0 && (
        <div className={clsx(
          'text-sm font-medium mt-4 pt-4 border-t border-border flex items-center gap-2',
          delta > 0 ? 'text-primary' : 'text-destructive'
        )}>
          <span className="text-lg">{delta > 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(delta)} today</span>
        </div>
      )}
    </div>
  )
}
