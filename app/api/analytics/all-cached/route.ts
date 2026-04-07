import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DateRange } from '@/lib/analytics-types'

export async function GET(request: NextRequest) {
  const days = (request.nextUrl.searchParams.get('days') || '7') as DateRange

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } })
  }

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('analytics_cache')
      .select('site_id, data, cached_at')
      .eq('date_range', days)

    if (!data || data.length === 0) {
      return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } })
    }

    const result = Object.fromEntries(
      data.map((row) => [row.site_id, { ...row.data, cachedAt: row.cached_at }])
    )

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('Bulk cache read failed:', e)
    return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } })
  }
}
