'use client'

import { Card } from '@tremor/react'
import { TrendingDown, UserPlus, Repeat } from 'lucide-react'

interface InsightCardsProps {
  bounceRate: number
  newVisitors: number
  returningVisitors: number
  isLoading?: boolean
}

export function InsightCards({ bounceRate, newVisitors, returningVisitors, isLoading }: InsightCardsProps) {
  const total = newVisitors + returningVisitors
  const newPct = total > 0 ? Math.round((newVisitors / total) * 100) : 0
  const returningPct = total > 0 ? Math.round((returningVisitors / total) * 100) : 0

  const stats = [
    {
      title: 'Bounce Rate',
      value: isLoading ? '...' : `${bounceRate}%`,
      sub: 'Single-page sessions',
      icon: TrendingDown,
      color: bounceRate > 70 ? '#ef4444' : bounceRate > 50 ? '#f59e0b' : '#10b981',
    },
    {
      title: 'New Visitors',
      value: isLoading ? '...' : newVisitors.toLocaleString(),
      sub: isLoading ? '' : `${newPct}% of sessions`,
      icon: UserPlus,
      color: '#6366f1',
    },
    {
      title: 'Returning Visitors',
      value: isLoading ? '...' : returningVisitors.toLocaleString(),
      sub: isLoading ? '' : `${returningPct}% of sessions`,
      icon: Repeat,
      color: '#8b5cf6',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title} className="p-4">
          <div className="flex items-center gap-2">
            <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
            <span className="text-sm text-muted-foreground">{stat.title}</span>
          </div>
          <div className="mt-2 text-2xl font-bold" style={{ color: stat.color }}>
            {stat.value}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{stat.sub}</div>
        </Card>
      ))}
    </div>
  )
}
