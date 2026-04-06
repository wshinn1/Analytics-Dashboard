import { sitesConfig } from '@/lib/sites-config'
import { SiteSection } from '@/components/analytics/site-section'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AnalyticsData } from '@/lib/analytics-types'

async function getInitialData(): Promise<Record<string, AnalyticsData>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return {}
  try {
    const supabase = createAdminClient()
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
    const result = await Promise.race([
      supabase.from('analytics_cache').select('site_id, data, cached_at').eq('date_range', '7'),
      timeout,
    ])
    if (!result || !('data' in result) || !result.data) return {}
    return Object.fromEntries(
      result.data.map((row) => [row.site_id, { ...row.data, cachedAt: row.cached_at }])
    )
  } catch {
    return {}
  }
}

export default async function DashboardPage() {
  const initialData = await getInitialData()

  return (
    <div className="p-4 pt-18 lg:p-8 lg:pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor traffic and engagement across all your sites
        </p>
      </div>

      <div className="space-y-4">
        {sitesConfig.map((site, index) => (
          <SiteSection
            key={site.id}
            site={site}
            defaultExpanded={index === 0}
            initialData={initialData[site.id]}
          />
        ))}
      </div>
    </div>
  )
}
