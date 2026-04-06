import useSWR from 'swr'
import type { AnalyticsData, DateRange } from '@/lib/analytics-types'

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch analytics')
    return res.json()
  })

export function useAnalytics(siteId: string, days: DateRange) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<AnalyticsData>(
    `/api/analytics/${siteId}?days=${days}`,
    fetcher,
    {
      refreshInterval: 180000, // Auto-refresh every 3 minutes
      revalidateOnFocus: true,
    }
  )

  // Force-refresh bypasses the server-side cache and fetches live from PostHog
  const forceRefresh = () =>
    mutate(
      fetcher(`/api/analytics/${siteId}?days=${days}&refresh=true`),
      { revalidate: false }
    )

  return {
    data,
    error,
    isLoading,
    isRefreshing: isValidating && !isLoading,
    refresh: forceRefresh,
  }
}
