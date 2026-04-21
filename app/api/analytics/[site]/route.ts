import { NextRequest, NextResponse } from 'next/server'
import { sitesConfig } from '@/lib/sites-config'
import type { AnalyticsData, DateRange } from '@/lib/analytics-types'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 300

const POSTHOG_API_URL = 'https://us.posthog.com/api/projects'

async function runHogQLQuery(query: string, projectId: string, apiKey: string) {
  const response = await fetch(`${POSTHOG_API_URL}/${projectId}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query,
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`PostHog API error: ${response.status} - ${text}`)
  }

  const data = await response.json()
  return data.results || []
}

const CUSTOM_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const CUSTOM_RANGE_RE = /^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/

function isCustomDate(days: DateRange): boolean {
  return CUSTOM_DATE_RE.test(days)
}

function parseDateRange(days: DateRange): { from: string; to: string } | null {
  const m = days.match(CUSTOM_RANGE_RE)
  return m ? { from: m[1], to: m[2] } : null
}

function getTimeInterval(days: DateRange): string {
  if (days === '24h') return 'timestamp >= now() - INTERVAL 24 HOUR'
  if (isCustomDate(days)) return `timestamp >= '${days} 00:00:00' AND timestamp < '${days} 23:59:59'`
  const range = parseDateRange(days)
  if (range) return `timestamp >= '${range.from} 00:00:00' AND timestamp < '${range.to} 23:59:59'`
  return `timestamp >= now() - INTERVAL ${days} DAY`
}

function getPeriodStart(days: DateRange): string {
  if (days === '24h') return `now() - INTERVAL 24 HOUR`
  if (isCustomDate(days)) return `'${days} 00:00:00'`
  const range = parseDateRange(days)
  if (range) return `'${range.from} 00:00:00'`
  return `now() - INTERVAL ${days} DAY`
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ site: string }> }
) {
  const { site } = await params
  const searchParams = request.nextUrl.searchParams
  const days = (searchParams.get('days') || '7') as DateRange

  const siteConfig = sitesConfig.find((s) => s.id === site)
  if (!siteConfig) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  // Validate days param — must be a preset, a single date, or a date range
  const validPresets = ['24h', '7', '30']
  if (!validPresets.includes(days) && !CUSTOM_DATE_RE.test(days) && !CUSTOM_RANGE_RE.test(days)) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID

  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: 'PostHog credentials not configured' },
      { status: 500 }
    )
  }

  // Always serve from cache unless ?refresh=true.
  // Cron jobs (5am/noon/5pm EST) and manual Refresh keep the cache current.
  const forceRefresh = searchParams.get('refresh') === 'true'
  if (!forceRefresh) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createAdminClient()
        const { data: cached } = await supabase
          .from('analytics_cache')
          .select('data, cached_at')
          .eq('site_id', site)
          .eq('date_range', days)
          .single()
        if (cached?.data) {
          console.log(`Cache hit: ${site} ${days}`)
          return NextResponse.json(
            { ...cached.data, cachedAt: cached.cached_at },
            { headers: { 'Cache-Control': 'no-store' } }
          )
        }
        console.log(`Cache miss: ${site} ${days} — returning empty, use Refresh to load`)
      } catch (e) {
        console.error(`Cache read failed: ${site} ${days}`, e)
      }
    }
    // No cache available — return null immediately, never call PostHog on normal load
    return NextResponse.json(null, { headers: { 'Cache-Control': 'no-store' } })
  }

  const timeInterval = getTimeInterval(days)
  const hostFilter = Array.isArray(siteConfig.hostFilter)
    ? `(${siteConfig.hostFilter.map((h) => `properties['$host'] = '${h}'`).join(' OR ')})`
    : `position(properties['$host'], '${siteConfig.hostFilter}') > 0`
  const domainParts = siteConfig.domain.split('.')
  const baseDomain = domainParts.length > 2 ? domainParts.slice(-2).join('.') : siteConfig.domain

  try {
    // Batch 1: Core metrics
    const [pageviewsResult, uniqueVisitorsResult, activeUsersResult] = await Promise.all([
      runHogQLQuery(
        `SELECT count() FROM events WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}`,
        projectId,
        apiKey
      ),
      runHogQLQuery(
        `SELECT count(DISTINCT distinct_id) FROM events WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}`,
        projectId,
        apiKey
      ),
      runHogQLQuery(
        `SELECT count(DISTINCT distinct_id) FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 5 MINUTE AND ${hostFilter}`,
        projectId,
        apiKey
      ),
    ])

    await delay(100)

    // Batch 2: Top pages and daily views
    const [topPagesResult, dailyViewsResult] = await Promise.all([
      runHogQLQuery(
        `SELECT properties['$pathname'] as path, count() as views 
         FROM events 
         WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
         GROUP BY path 
         ORDER BY views DESC 
         LIMIT 10`,
        projectId,
        apiKey
      ),
      runHogQLQuery(
        // Single day (24h or specific date) → hourly buckets; multi-day → daily buckets
        days === '24h' || isCustomDate(days)
          ? `SELECT formatDateTime(timestamp, '%Y-%m-%d %H:00') as date, count() as views
             FROM events
             WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
             GROUP BY date
             ORDER BY date ASC`
          : `SELECT formatDateTime(timestamp, '%Y-%m-%d') as date, count() as views
             FROM events
             WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
             GROUP BY date
             ORDER BY date ASC`,
        projectId,
        apiKey
      ),
    ])

    await delay(100)

    // Batch 3: Top posts (content path filtered)
    // For subdomain-tracked sites, include the hostname so you can tell which tenant the post belongs to
    const postPathField = siteConfig.trackSubdomains
      ? `concat(properties['$host'], properties['$pathname'])`
      : `properties['$pathname']`
    const safeQuery = async (q: string) => {
      try { return await runHogQLQuery(q, projectId, apiKey) } catch { return [] }
    }
    // Use safeQuery so a topPosts failure doesn't abort the whole request.
    // GROUP BY uses the expression directly (not the alias) for unambiguous HogQL resolution.
    const topPostsResult = await safeQuery(
      `SELECT ${postPathField} as path, count() as views
       FROM events
       WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
       AND properties['$pathname'] LIKE '${siteConfig.contentPath}%'
       GROUP BY ${postPathField}
       ORDER BY views DESC
       LIMIT 10`
    )

    await delay(100)

    // Batch 4: Insights — referrers, devices, browsers, bounce rate, new vs returning
    const periodStart = getPeriodStart(days)

    const [referrersResult, devicesResult, browsersResult, bounceResult, newVsReturningResult] =
      await Promise.all([
        safeQuery(
          `SELECT
             multiIf(
               properties['$referring_domain'] = '$direct'
                 OR properties['$referring_domain'] IS NULL
                 OR properties['$referring_domain'] = '', 'Direct',
               properties['$referring_domain']
             ) as source,
             count() as visits
           FROM events
           WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
           AND (
             properties['$referring_domain'] = '$direct'
             OR properties['$referring_domain'] IS NULL
             OR properties['$referring_domain'] = ''
             OR (
               properties['$referring_domain'] NOT LIKE '%${baseDomain}%'
               AND properties['$referring_domain'] NOT LIKE '%.vercel.app%'
               AND properties['$referring_domain'] NOT LIKE '%localhost%'
             )
           )
           GROUP BY source
           ORDER BY visits DESC
           LIMIT 10`
        ),
        safeQuery(
          `SELECT
             if(properties['$device_type'] IS NULL OR properties['$device_type'] = '',
               'Desktop', properties['$device_type']) as device,
             count() as views
           FROM events
           WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
           GROUP BY device
           ORDER BY views DESC`
        ),
        safeQuery(
          `SELECT properties['$browser'] as browser, count() as views
           FROM events
           WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
           AND properties['$browser'] IS NOT NULL AND properties['$browser'] != ''
           GROUP BY browser
           ORDER BY views DESC
           LIMIT 8`
        ),
        safeQuery(
          `SELECT round(countIf(session_views = 1) * 100.0 / count(), 1) as bounce_rate
           FROM (
             SELECT properties['$session_id'] as sid, count() as session_views
             FROM events
             WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
             AND properties['$session_id'] IS NOT NULL AND properties['$session_id'] != ''
             GROUP BY sid
           )`
        ),
        safeQuery(
          `SELECT
             countIf(first_seen >= ${periodStart}) as new_visitors,
             countIf(first_seen < ${periodStart}) as returning_visitors
           FROM (
             SELECT distinct_id, min(timestamp) as first_seen
             FROM events
             WHERE event = '$pageview' AND ${hostFilter}
             AND distinct_id IN (
               SELECT DISTINCT distinct_id FROM events
               WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
             )
             GROUP BY distinct_id
           )`
        ),
      ])

    await delay(100)

    // Batch 5: Geo data
    const [countriesResult, citiesResult, statesResult] = await Promise.all([
      runHogQLQuery(
        `SELECT properties['$geoip_country_name'] as country, count() as views 
         FROM events 
         WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
         AND properties['$geoip_country_name'] IS NOT NULL
         GROUP BY country 
         ORDER BY views DESC 
         LIMIT 10`,
        projectId,
        apiKey
      ),
      runHogQLQuery(
        `SELECT properties['$geoip_city_name'] as city, count() as views 
         FROM events 
         WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
         AND properties['$geoip_city_name'] IS NOT NULL
         GROUP BY city 
         ORDER BY views DESC 
         LIMIT 10`,
        projectId,
        apiKey
      ),
      runHogQLQuery(
        `SELECT properties['$geoip_subdivision_1_name'] as state, count() as views 
         FROM events 
         WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
         AND properties['$geoip_subdivision_1_name'] IS NOT NULL
         GROUP BY state 
         ORDER BY views DESC 
         LIMIT 10`,
        projectId,
        apiKey
      ),
    ])

    // Geocode top cities using Mapbox
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    const topCitiesForMap = citiesResult.slice(0, 20)
    const geocodedLocations = mapboxToken
      ? await Promise.all(
          topCitiesForMap.map(async (row: [string, number]) => {
            const city = row[0]
            const views = row[1] || 0
            if (!city) return null
            try {
              const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city)}.json?types=place,locality,neighborhood,district&limit=1&access_token=${mapboxToken}`
              )
              const data = await res.json()
              const feature = data.features?.[0]
              if (!feature) return null
              const [lng, lat] = feature.center
              return { lat, lng, city, country: feature.context?.find((c: { id: string; text: string }) => c.id.startsWith('country'))?.text || '', views }
            } catch {
              return null
            }
          })
        ).then((results) => results.filter(Boolean))
      : []

    const now = new Date().toISOString()
    const analyticsData: AnalyticsData = {
      cachedAt: now,
      pageviews: pageviewsResult[0]?.[0] || 0,
      uniqueVisitors: uniqueVisitorsResult[0]?.[0] || 0,
      activeUsers: activeUsersResult[0]?.[0] || 0,
      topPages: topPagesResult.map((row: [string, number]) => ({
        path: row[0] || '/',
        views: row[1] || 0,
      })),
      topPosts: topPostsResult.map((row: [string, number]) => ({
        path: row[0] || '/',
        views: row[1] || 0,
      })),
      dailyViews: dailyViewsResult.map((row: [string, number]) => ({
        date: row[0],
        views: row[1] || 0,
      })),
      topCountries: countriesResult.map((row: [string, number]) => ({
        country: row[0] || 'Unknown',
        views: row[1] || 0,
      })),
      topCities: citiesResult.map((row: [string, number]) => ({
        city: row[0] || 'Unknown',
        views: row[1] || 0,
      })),
      topStates: statesResult.map((row: [string, number]) => ({
        state: row[0] || 'Unknown',
        views: row[1] || 0,
      })),
      mapLocations: geocodedLocations as { lat: number; lng: number; city: string; country: string; views: number }[],
      topReferrers: referrersResult.map((row: [string, number]) => ({
        source: row[0] || 'Direct',
        visits: row[1] || 0,
      })),
      devices: devicesResult.map((row: [string, number]) => ({
        device: row[0] || 'Desktop',
        views: row[1] || 0,
      })),
      browsers: browsersResult.map((row: [string, number]) => ({
        browser: row[0] || 'Unknown',
        views: row[1] || 0,
      })),
      bounceRate: bounceResult[0]?.[0] ?? 0,
      newVisitors: newVsReturningResult[0]?.[0] ?? 0,
      returningVisitors: newVsReturningResult[0]?.[1] ?? 0,
    }

    // Write result to Supabase cache
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createAdminClient()
        const { error: upsertError } = await supabase
          .from('analytics_cache')
          .upsert(
            { site_id: site, date_range: days, data: analyticsData, cached_at: new Date().toISOString() },
            { onConflict: 'site_id,date_range' }
          )
        if (upsertError) {
          console.error(`Cache write failed for ${site} ${days}:`, upsertError)
        } else {
          console.log(`Cache write OK: ${site} ${days}`)
        }
      } catch (e) {
        console.error('Cache write exception:', e)
      }
    } else {
      console.warn('Supabase env vars not set — skipping cache write')
    }

    return NextResponse.json(analyticsData, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
