'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAnalytics } from '@/hooks/use-analytics'
import type { SiteConfig } from '@/lib/sites-config'
import type { DateRange } from '@/lib/analytics-types'
import { StatCards } from './stat-cards'
import { TrafficChart } from './traffic-chart'
import { TopList } from './top-list'
import { GeoCards } from './geo-cards'
import { DateRangeSelect } from './date-range-select'

const VisitorMap = dynamic(
  () => import('./visitor-map').then((m) => ({ default: m.VisitorMap })),
  { ssr: false }
)

interface SiteSectionProps {
  site: SiteConfig
  defaultExpanded?: boolean
}

export function SiteSection({ site, defaultExpanded = false }: SiteSectionProps) {
  const storageKey = `analytics-expanded-${site.id}`
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [dateRange, setDateRange] = useState<DateRange>('7')
  const { data, isLoading, error, refresh } = useAnalytics(site.id, dateRange)

  // Load expanded state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored !== null) {
      setIsExpanded(stored === 'true')
    }
  }, [storageKey])

  // Save expanded state to localStorage
  const toggleExpanded = () => {
    const newValue = !isExpanded
    setIsExpanded(newValue)
    localStorage.setItem(storageKey, String(newValue))
  }

  const topPagesData = data?.topPages.map((p) => ({
    name: p.path,
    value: p.views,
  })) || []

  const topPostsData = data?.topPosts.map((p) => ({
    name: p.path,
    value: p.views,
  })) || []

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header - always visible */}
      <button
        onClick={toggleExpanded}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">{site.name}</h2>
            <p className="text-sm text-muted-foreground">{site.domain}</p>
          </div>
        </div>
        {!isExpanded && data && (
          <div className="text-sm text-muted-foreground">
            {data.pageviews.toLocaleString()} views
          </div>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border p-4">
          {/* Controls */}
          <div className="mb-6 flex items-center justify-between">
            <DateRangeSelect value={dateRange} onChange={setDateRange} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {error ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-center text-destructive">
              Failed to load analytics. Please try again.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stat Cards */}
              <StatCards
                pageviews={data?.pageviews || 0}
                uniqueVisitors={data?.uniqueVisitors || 0}
                countriesCount={data?.topCountries.length || 0}
                statesCount={data?.topStates.length || 0}
                citiesCount={data?.topCities.length || 0}
                isLoading={isLoading}
              />

              {/* Traffic Chart */}
              <TrafficChart data={data?.dailyViews || []} isLoading={isLoading} />

              {/* Top Pages and Posts */}
              <div className="grid gap-4 lg:grid-cols-2">
                <TopList title="Top Pages" data={topPagesData} isLoading={isLoading} />
                <TopList title="Top Posts" data={topPostsData} isLoading={isLoading} />
              </div>

              {/* Visitor Map */}
              <VisitorMap
                locations={data?.mapLocations || []}
                isLoading={isLoading}
              />

              {/* Geo Data */}
              <GeoCards
                topCountries={data?.topCountries || []}
                topStates={data?.topStates || []}
                topCities={data?.topCities || []}
                isLoading={isLoading}
              />

              {/* Active Users indicator */}
              {data && data.activeUsers > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                  {data.activeUsers} active {data.activeUsers === 1 ? 'user' : 'users'} right now
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
