'use client'

import { Card, Title } from '@tremor/react'

interface TrafficSourcesProps {
  data: { source: string; visits: number }[]
  isLoading?: boolean
}

// Map referrer domains to friendly names and brand colors
const SOURCE_MAP: { match: string; label: string; color: string }[] = [
  { match: 'google',      label: 'Google',       color: '#4285f4' },
  { match: 'bing',        label: 'Bing',         color: '#00897b' },
  { match: 'duckduckgo',  label: 'DuckDuckGo',   color: '#de5833' },
  { match: 'yahoo',       label: 'Yahoo',        color: '#6001d2' },
  { match: 'facebook',    label: 'Facebook',     color: '#1877f2' },
  { match: 'instagram',   label: 'Instagram',    color: '#e1306c' },
  { match: 'twitter',     label: 'Twitter/X',    color: '#000000' },
  { match: 't.co',        label: 'Twitter/X',    color: '#000000' },
  { match: 'x.com',       label: 'Twitter/X',    color: '#000000' },
  { match: 'linkedin',    label: 'LinkedIn',     color: '#0a66c2' },
  { match: 'youtube',     label: 'YouTube',      color: '#ff0000' },
  { match: 'pinterest',   label: 'Pinterest',    color: '#e60023' },
  { match: 'reddit',      label: 'Reddit',       color: '#ff4500' },
  { match: 'tiktok',      label: 'TikTok',       color: '#010101' },
  { match: 'upwork',      label: 'Upwork',       color: '#14a800' },
  { match: 'substack',    label: 'Substack',     color: '#ff6719' },
  { match: 'medium',      label: 'Medium',       color: '#000000' },
  { match: 'github',      label: 'GitHub',       color: '#24292e' },
]

function getSourceInfo(raw: string): { label: string; color: string } {
  if (raw === 'Direct') return { label: 'Direct', color: '#6366f1' }
  const lower = raw.toLowerCase()
  for (const s of SOURCE_MAP) {
    if (lower.includes(s.match)) return { label: s.label, color: s.color }
  }
  // Strip www. and show raw domain
  return { label: raw.replace(/^www\./, ''), color: '#94a3b8' }
}

export function TrafficSources({ data, isLoading }: TrafficSourcesProps) {
  // Merge rows that map to the same label (e.g. twitter.com + t.co → Twitter/X)
  const merged = data.reduce<{ source: string; label: string; color: string; visits: number }[]>(
    (acc, item) => {
      const { label, color } = getSourceInfo(item.source)
      const existing = acc.find((r) => r.label === label)
      if (existing) {
        existing.visits += item.visits
      } else {
        acc.push({ source: item.source, label, color, visits: item.visits })
      }
      return acc
    },
    []
  ).sort((a, b) => b.visits - a.visits)

  const max = Math.max(...merged.map((d) => d.visits), 1)

  return (
    <Card className="p-6">
      <Title>Traffic Sources</Title>
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : merged.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <span className="text-muted-foreground">No data available</span>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {merged.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <div className="relative h-7 flex-1 overflow-hidden rounded" style={{ background: '#f3f4f6' }}>
                <div
                  className="absolute left-0 top-0 h-full rounded"
                  style={{ width: `${(item.visits / max) * 100}%`, backgroundColor: item.color, opacity: 0.2 }}
                />
                <div className="relative flex items-center gap-1.5 pl-2 leading-7">
                  <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate text-gray-700">{item.label}</span>
                </div>
              </div>
              <span className="w-10 text-right font-medium text-gray-600">{item.visits.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
