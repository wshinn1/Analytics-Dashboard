import useSWR from 'swr'
import { useEffect, useState } from 'react'
import type { AnalyticsData, DateRange } from '@/lib/analytics-types'

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch analytics')
    return res.json()
  })

function storageKey(siteId: string, days: DateRange) {
  return `analytics_${siteId}_${days}`
}

function readLocal(siteId: string, days: DateRange): AnalyticsData | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(storageKey(siteId, days))
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

function writeLocal(siteId: string, days: DateRange, data: AnalyticsData) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(siteId, days), JSON.stringify(data))
  } catch {
    // ignore (storage full, private mode, etc.)
  }
}

export function useAnalytics(siteId: string, days: DateRange) {
  const fallbackData = readLocal(siteId, days)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<AnalyticsData>(
    `/api/analytics/${siteId}?days=${days}`,
    fetcher,
    {
      fallbackData,             // show localStorage data immediately
      refreshInterval: 180000,  // background refresh every 3 minutes
      revalidateOnFocus: false,
    }
  )

  // Keep localStorage in sync whenever fresh data arrives
  useEffect(() => {
    if (data) writeLocal(siteId, days, data)
  }, [data, siteId, days])

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
    isLoading,       // false immediately if localStorage has data
    isRefreshing: isManualRefreshing,
    refresh: forceRefresh,
  }
}
