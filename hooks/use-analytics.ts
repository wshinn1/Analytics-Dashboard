import useSWR from 'swr'
import { useState } from 'react'
import type { AnalyticsData, DateRange } from '@/lib/analytics-types'

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch analytics')
    return res.json()
  })

export function useAnalytics(siteId: string, days: DateRange) {
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<AnalyticsData>(
    `/api/analytics/${siteId}?days=${days}`,
    fetcher,
    {
      refreshInterval: 180000,  // background refresh every 3 minutes
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
