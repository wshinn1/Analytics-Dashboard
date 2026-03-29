import useSWR from 'swr'
import type { AnalyticsData, DateRange } from '@/lib/analytics-types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useAnalytics(siteId: string, days: DateRange) {
  const { data, error, isLoading, mutate } = useSWR<AnalyticsData>(
    `/api/analytics/${siteId}?days=${days}`,
    fetcher,
    {
      refreshInterval: 30000, // Auto-refresh every 30 seconds
      revalidateOnFocus: true,
    }
  )

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  }
}
