'use client'

import { sitesConfig } from '@/lib/sites-config'
import { SiteSection } from '@/components/analytics/site-section'

export default function DashboardPage() {
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
          <SiteSection key={site.id} site={site} defaultExpanded={index === 0} />
        ))}
      </div>
    </div>
  )
}
