'use client'

import { Card, Title } from '@tremor/react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface TrafficChartProps {
  data: { date: string; views: number }[]
  isLoading?: boolean
}

export function TrafficChart({ data, isLoading }: TrafficChartProps) {
  return (
    <Card className="p-6">
      <Title>Traffic Overview</Title>
      {isLoading ? (
        <div className="flex h-72 items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={288}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 13 }}
              formatter={(v: number) => [v.toLocaleString(), 'Page Views']}
            />
            <Area
              type="monotone"
              dataKey="views"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#colorViews)"
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
