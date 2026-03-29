'use client'

import { Card, Title } from '@tremor/react'

interface TrafficSourcesProps {
  data: { source: string; visits: number }[]
  isLoading?: boolean
}

const SOURCE_COLORS: Record<string, string> = {
  Direct: '#6366f1',
  Google: '#4285f4',
  Bing: '#00897b',
  Facebook: '#1877f2',
  'Twitter/X': '#000000',
  Instagram: '#e1306c',
  YouTube: '#ff0000',
  LinkedIn: '#0a66c2',
}

function getColor(source: string): string {
  for (const key of Object.keys(SOURCE_COLORS)) {
    if (source.toLowerCase().includes(key.toLowerCase())) return SOURCE_COLORS[key]
  }
  return '#94a3b8'
}

export function TrafficSources({ data, isLoading }: TrafficSourcesProps) {
  const max = Math.max(...data.map((d) => d.visits), 1)

  return (
    <Card className="p-6">
      <Title>Traffic Sources</Title>
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <span className="text-muted-foreground">No data available</span>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {data.map((item) => {
            const color = getColor(item.source)
            return (
              <div key={item.source} className="flex items-center gap-2 text-sm">
                <div className="relative h-7 flex-1 overflow-hidden rounded" style={{ background: '#f3f4f6' }}>
                  <div
                    className="absolute left-0 top-0 h-full rounded"
                    style={{ width: `${(item.visits / max) * 100}%`, backgroundColor: color, opacity: 0.2 }}
                  />
                  <div className="relative flex items-center gap-1.5 pl-2 leading-7">
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="truncate text-gray-700">{item.source}</span>
                  </div>
                </div>
                <span className="w-10 text-right font-medium text-gray-600">{item.visits.toLocaleString()}</span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
