import { NextRequest, NextResponse } from 'next/server'
import { sitesConfig } from '@/lib/sites-config'
import type { DateRange } from '@/lib/analytics-types'

export const maxDuration = 300

const DATE_RANGES: DateRange[] = ['24h', '7', '30']

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const results: { site: string; range: string; ok: boolean }[] = []

  // Run sequentially to avoid overwhelming PostHog with 15 parallel queries
  for (const site of sitesConfig) {
    for (const range of DATE_RANGES) {
      try {
        const res = await fetch(
          `${baseUrl}/api/analytics/${site.id}?days=${range}&refresh=true`,
          { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }
        )
        results.push({ site: site.id, range, ok: res.ok })
        console.log(`Prefetch ${site.id} ${range}: ${res.ok ? 'OK' : res.status}`)
      } catch (e) {
        console.error(`Prefetch ${site.id} ${range} failed:`, e)
        results.push({ site: site.id, range, ok: false })
      }
    }
  }

  return NextResponse.json({ prefetched: results })
}
