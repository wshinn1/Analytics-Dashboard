import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID

  if (!apiKey || !projectId) {
    return NextResponse.json({ error: 'PostHog credentials not configured' }, { status: 500 })
  }

  const response = await fetch(`https://us.posthog.com/api/projects/${projectId}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query: `SELECT DISTINCT properties['$host'] as host, count() as events
                FROM events
                WHERE event = '$pageview'
                AND timestamp >= now() - INTERVAL 30 DAY
                GROUP BY host
                ORDER BY events DESC`,
      },
    }),
  })

  const data = await response.json()
  const hosts = (data.results || []).map(([host, events]: [string, number]) => ({ host, events }))
  return NextResponse.json(hosts)
}
