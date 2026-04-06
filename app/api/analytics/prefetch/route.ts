import { NextRequest, NextResponse } from 'next/server'
import { sitesConfig } from '@/lib/sites-config'
import type { DateRange } from '@/lib/analytics-types'

const DATE_RANGES: DateRange[] = ['24h', '7', '30']

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const jobs = sitesConfig.flatMap((site) =>
    DATE_RANGES.map(async (range) => {
      try {
        const res = await fetch(
          `${baseUrl}/api/analytics/${site.id}?days=${range}&refresh=true`,
          { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }
        )
        return { site: site.id, range, ok: res.ok }
      } catch {
        return { site: site.id, range, ok: false }
      }
    })
  )

  const results = await Promise.all(jobs)
  return NextResponse.json({ prefetched: results })
}
