import { NextRequest, NextResponse } from 'next/server'
import { sitesConfig } from '@/lib/sites-config'
import type { AnalyticsData, DateRange } from '@/lib/analytics-types'

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

function getTimeInterval(days: DateRange): string {
  if (days === '24h') {
    return 'timestamp >= now() - INTERVAL 24 HOUR'
  }
  return `timestamp >= now() - INTERVAL ${days} DAY`
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

  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID

  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: 'PostHog credentials not configured' },
      { status: 500 }
    )
  }

  const timeInterval = getTimeInterval(days)
  const hostFilter = `properties['$host'] LIKE '${siteConfig.hostFilter}'`

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
        days === '24h'
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
    const topPostsResult = await runHogQLQuery(
      `SELECT properties['$pathname'] as path, count() as views 
       FROM events 
       WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
       AND properties['$pathname'] LIKE '${siteConfig.contentPath}%'
       GROUP BY path 
       ORDER BY views DESC 
       LIMIT 10`,
      projectId,
      apiKey
    )

    await delay(100)

    await delay(100)

    // Batch 4b: Map locations
    let mapLocationsResult: [string, string, string, string, number][] = []
    try {
      mapLocationsResult = await runHogQLQuery(
        `SELECT
           properties['$geoip_latitude'] as lat,
           properties['$geoip_longitude'] as lng,
           properties['$geoip_city_name'] as city,
           properties['$geoip_country_name'] as country,
           count() as views
         FROM events
         WHERE event = '$pageview' AND ${timeInterval} AND ${hostFilter}
         AND properties['$geoip_latitude'] != ''
         AND properties['$geoip_longitude'] != ''
         GROUP BY lat, lng, city, country
         ORDER BY views DESC
         LIMIT 200`,
        projectId,
        apiKey
      )
    } catch (e) {
      console.error('Map locations query failed:', e)
    }

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

    const analyticsData: AnalyticsData = {
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
      mapLocations: mapLocationsResult
        .filter((row) => row[0] && row[1])
        .map((row) => ({
          lat: parseFloat(String(row[0])),
          lng: parseFloat(String(row[1])),
          city: row[2] || 'Unknown',
          country: row[3] || 'Unknown',
          views: row[4] || 0,
        }))
        .filter((loc) => !isNaN(loc.lat) && !isNaN(loc.lng)),
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
