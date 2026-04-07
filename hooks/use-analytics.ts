import useSWR from 'swr'
import { useState } from 'react'
import type { AnalyticsData, DateRange } from '@/lib/analytics-types'

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch analytics')
    return res.json()
  })

export function isNotCached(data: unknown): boolean {
  return !!data && typeof data === 'object' && 'notCached' in (data as object)
}

export function useAnalytics(siteId: string, days: DateRange, initialData?: AnalyticsData) {
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  const fallbackData = days === '7' ? initialData : undefined

  const { data, error, isLoading, mutate } = useSWR<AnalyticsData>(
    `/api/analytics/${siteId}?days=${days}`,
    fetcher,
    {
      fallbackData,
      // Don't re-fetch on mount when we already have server-rendered data.
      // Key changes (date range switch) always fetch regardless of this flag.
      revalidateOnMount: !fallbackData,
      revalidateOnFocus: false,
    }
  )

  // Force-refresh bypasses server cache, fetches live from PostHog
  const forceRefresh = async () => {
    setIsManualRefreshing(true)
    try {
      await mutate(
        fetcher(`/api/analytics/${siteId}?days=${days}&refresh=true`),
        { revalidate: false }
      )
    } finally {
      setIsManualRefreshing(false)
    }
  }

  return {
    data,
    error,
    isLoading,
    isRefreshing: isManualRefreshing,
    refresh: forceRefresh,
  }
}
