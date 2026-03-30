import useSWR from 'swr'
import type { AnalyticsData, DateRange } from '@/lib/analytics-types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useAnalytics(siteId: string, days: DateRange) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<AnalyticsData>(
    `/api/analytics/${siteId}?days=${days}`,
    fetcher,
    {
      refreshInterval: 180000, // Auto-refresh every 3 minutes
      revalidateOnFocus: true,
    }
  )

  return {
    data,
    error,
    isLoading: isLoading || isValidating,
    refresh: mutate,
  }
}
