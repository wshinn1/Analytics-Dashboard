# AI Insights SaaS — Full Build Plan

## Existing Codebase Context

This project is a **Next.js 14 App Router** analytics dashboard built with TypeScript, Tailwind CSS, shadcn/ui, Supabase, and PostHog. It is currently a **single-tenant** personal analytics tool. You are extending it into a **multi-tenant SaaS** with AI insights powered by the Claude API.

**Tech stack already in place:**
- Next.js 14 App Router (TypeScript)
- Tailwind CSS + shadcn/ui + Radix UI
- Supabase (Auth + PostgreSQL cache)
- PostHog HogQL API for traffic metrics
- SWR for client-side data fetching
- Vercel deployment with cron jobs
- Mapbox for geo maps
- Recharts for traffic charts

**Key existing files:**

```
lib/
  sites-config.ts          # Array of tracked sites (id, name, domain, hostFilter, contentPath, color)
  analytics-types.ts       # AnalyticsData interface + DateRange type
  supabase/
    admin.ts               # createAdminClient() — service role, server-side only
    server.ts              # createClient() — server component Supabase client
    client.ts              # createBrowserClient() — browser Supabase client
    middleware.ts          # Auth middleware protecting /dashboard routes

app/
  (dashboard)/
    layout.tsx             # Server component — checks Supabase auth, redirects to /login
    page.tsx               # Client component — SWR fetches /api/analytics/all-cached?days=7
  api/analytics/
    [site]/route.ts        # Per-site analytics — checks cache, calls PostHog on ?refresh=true
    all-cached/route.ts    # Bulk cache read — one Supabase query returns all sites
    prefetch/route.ts      # Cron endpoint — loops all sites × date ranges, writes to Supabase
  login/page.tsx
  signup/page.tsx

hooks/
  use-analytics.ts         # SWR hook with manual refresh logic

components/analytics/
  site-section.tsx         # Collapsible per-site section — renders all metric cards
  stat-cards.tsx
  insight-cards.tsx
  traffic-chart.tsx
  traffic-sources.tsx
  device-cards.tsx
  top-list.tsx
  geo-cards.tsx
  visitor-map.tsx
  date-range-select.tsx
```

**Existing Supabase table:**
```sql
analytics_cache (
  id uuid PRIMARY KEY,
  site_id text NOT NULL,
  date_range text NOT NULL,
  data jsonb NOT NULL,
  cached_at timestamptz NOT NULL,
  UNIQUE(site_id, date_range)
)
```

**Existing env vars:**
```
POSTHOG_PERSONAL_API_KEY
POSTHOG_PROJECT_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
CRON_SECRET
NEXT_PUBLIC_MAPBOX_TOKEN
```

---

## What You Are Building

Transform this into a **multi-tenant SaaS analytics platform** with three phases:

- **Phase 1 — AI Insights (PostHog data):** Add a Claude-powered insights card to each site section
- **Phase 2 — Google Search Console:** OAuth connect flow so tenants link their GSC property; enrich AI insights with keyword data
- **Phase 3 — Multi-tenant:** Each user manages their own sites, PostHog credentials, and subscription

Build phases in order. Each phase should be fully working before starting the next.

---

## Phase 1 — AI Insights Card

### New env vars needed
```
ANTHROPIC_API_KEY=sk-ant-...
```

Install the Anthropic SDK:
```bash
pnpm add @anthropic-ai/sdk
```

### New Supabase table
Run in Supabase SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS ai_insights_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id text NOT NULL,
  date_range text NOT NULL,
  insights jsonb NOT NULL,
  generated_at timestamptz NOT NULL,
  UNIQUE(site_id, date_range)
);

ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access" ON public.ai_insights_cache FOR ALL USING (false);
```

### New file: `lib/ai-insights.ts`
This module formats analytics data into a structured Claude prompt and returns parsed insights.

```ts
import Anthropic from '@anthropic-ai/sdk'
import type { AnalyticsData } from './analytics-types'

export interface AiInsight {
  type: 'positive' | 'warning' | 'opportunity' | 'trend'
  title: string
  detail: string
}

export interface AiInsightsResult {
  summary: string
  insights: AiInsight[]
  generatedAt: string
}

export async function generateInsights(
  siteName: string,
  domain: string,
  dateRange: string,
  data: AnalyticsData,
  gscKeywords?: { query: string; clicks: number; impressions: number; position: number }[]
): Promise<AiInsightsResult> {
  const client = new Anthropic()

  const rangeLabel = dateRange === '24h' ? 'last 24 hours' : dateRange === '7' ? 'last 7 days' : 'last 30 days'

  const topPages = data.topPages.slice(0, 5).map(p => `  ${p.path} — ${p.views} views`).join('\n')
  const topReferrers = data.topReferrers.slice(0, 5).map(r => `  ${r.source} — ${r.visits} visits`).join('\n')
  const devices = data.devices.map(d => `  ${d.device}: ${d.views}`).join('\n')
  const topCountries = data.topCountries.slice(0, 3).map(c => `  ${c.country}: ${c.views}`).join('\n')
  const gscSection = gscKeywords && gscKeywords.length > 0
    ? `\nSEARCH CONSOLE (top keywords):\n${gscKeywords.slice(0, 10).map(k => `  "${k.query}" — ${k.clicks} clicks, ${k.impressions} impressions, position ${k.position.toFixed(1)}`).join('\n')}`
    : ''

  const prompt = `You are an analytics expert reviewing traffic data for ${siteName} (${domain}) over the ${rangeLabel}.

TRAFFIC METRICS:
  Page views: ${data.pageviews.toLocaleString()}
  Unique visitors: ${data.uniqueVisitors.toLocaleString()}
  Active users right now: ${data.activeUsers}
  Bounce rate: ${data.bounceRate}%
  New visitors: ${data.newVisitors} | Returning: ${data.returningVisitors}

TOP PAGES:
${topPages}

TRAFFIC SOURCES:
${topReferrers}

DEVICES:
${devices}

TOP COUNTRIES:
${topCountries}
${gscSection}

Respond ONLY with valid JSON in this exact shape:
{
  "summary": "2-3 sentence plain-English summary of overall site performance",
  "insights": [
    {
      "type": "positive" | "warning" | "opportunity" | "trend",
      "title": "short title (max 8 words)",
      "detail": "1-2 sentence explanation with specific numbers from the data"
    }
  ]
}

Return 4-6 insights. Be specific, actionable, and reference actual numbers. No markdown, no extra text — only the JSON object.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(text)

  return {
    summary: parsed.summary,
    insights: parsed.insights,
    generatedAt: new Date().toISOString(),
  }
}
```

### New API route: `app/api/insights/[site]/route.ts`
```ts
import { NextRequest, NextResponse } from 'next/server'
import { sitesConfig } from '@/lib/sites-config'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateInsights } from '@/lib/ai-insights'
import type { DateRange, AnalyticsData } from '@/lib/analytics-types'

export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ site: string }> }
) {
  const { site } = await params
  const days = (request.nextUrl.searchParams.get('days') || '7') as DateRange
  const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'

  const siteConfig = sitesConfig.find((s) => s.id === site)
  if (!siteConfig) return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })

  const supabase = createAdminClient()

  // Serve from cache unless forcing refresh
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from('ai_insights_cache')
      .select('insights, generated_at')
      .eq('site_id', site)
      .eq('date_range', days)
      .single()

    if (cached?.insights) {
      return NextResponse.json(
        { ...cached.insights, generatedAt: cached.generated_at },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }
  }

  // Read analytics data from cache
  const { data: analyticsRow } = await supabase
    .from('analytics_cache')
    .select('data')
    .eq('site_id', site)
    .eq('date_range', days)
    .single()

  if (!analyticsRow?.data) {
    return NextResponse.json(
      { error: 'No analytics data cached for this site. Refresh analytics first.' },
      { status: 404 }
    )
  }

  const analyticsData = analyticsRow.data as AnalyticsData

  try {
    const result = await generateInsights(siteConfig.name, siteConfig.domain, days, analyticsData)

    // Write to cache
    await supabase
      .from('ai_insights_cache')
      .upsert(
        { site_id: site, date_range: days, insights: result, generated_at: result.generatedAt },
        { onConflict: 'site_id,date_range' }
      )

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('AI insights error:', error)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
```

### New component: `components/analytics/ai-insights-card.tsx`

This is a client component. Use shadcn/ui `Card`. Design guidelines:

- Dark card with a subtle gradient header; use the site's `color` prop as an accent (thin top border)
- "AI Insights" label with a `Sparkles` icon from lucide-react
- Show the `summary` text first in a muted paragraph
- Below it, render each insight as a row with a colored left border based on `type`:
  - `positive` → green (`#10b981`)
  - `warning` → amber (`#f59e0b`)
  - `opportunity` → blue (`#3b82f6`)
  - `trend` → purple (`#8b5cf6`)
- Each insight row: icon + bold title + detail text beneath it
- "Regenerate" button (small, outline) in the top right — calls `?refresh=true`
- Loading skeleton (3 placeholder rows) while fetching using the shadcn `Skeleton` component
- Soft red error state message
- "Generate Insights" empty state when no cache exists — a centered button that triggers initial generation

Use SWR to fetch from `/api/insights/[site]?days=${dateRange}`. Add `isManualRefreshing` state (same pattern as `use-analytics.ts`) so only the Regenerate button disables during refresh, not the whole card.

Component signature:
```ts
interface AiInsightsCardProps {
  siteId: string
  dateRange: string
  siteColor: string
}
```

### Wire up in `components/analytics/site-section.tsx`

Import `AiInsightsCard` and add it after `<InsightCards>` and before `<TrafficChart>`:

```tsx
import { AiInsightsCard } from './ai-insights-card'

// Inside the expanded content, after <InsightCards ...>
<AiInsightsCard siteId={site.id} dateRange={dateRange} siteColor={site.color} />
```

---

## Phase 2 — Google Search Console Integration

### New env vars
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-domain.com/api/gsc/callback
```

Install Google API client:
```bash
pnpm add googleapis
```

### Google Cloud Console setup (manual step — do once)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable the **Google Search Console API**
4. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID** (Web application type)
5. Add authorized redirect URI: `https://your-domain.com/api/gsc/callback`
6. Set the OAuth consent screen scope to: `https://www.googleapis.com/auth/webmasters.readonly`
7. Copy Client ID and Client Secret to env vars

> **Note:** The `webmasters.readonly` scope is restricted. For public SaaS with unlimited users, submit your app for Google verification (takes 1–4 weeks). For personal or testing use, the default 100-user cap is fine.

### New Supabase table
```sql
CREATE TABLE IF NOT EXISTS gsc_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz NOT NULL,
  gsc_property_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, site_id)
);

ALTER TABLE public.gsc_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own tokens" ON public.gsc_tokens
  FOR ALL USING (auth.uid() = user_id);
```

### New API routes

**`app/api/gsc/connect/route.ts`**
- Reads `?site=siteId` query param
- Builds Google OAuth URL with `state=siteId` encoded
- Redirects to Google consent screen

**`app/api/gsc/callback/route.ts`**
- Exchanges `code` for tokens using `googleapis` OAuth2 client
- Reads `state` param to identify which `site_id` this is for
- Gets current Supabase user from server session
- Fetches user's GSC property list to find the matching property URL for that site's domain
- Upserts tokens into `gsc_tokens`
- Redirects back to dashboard with `?gsc=connected`

**`app/api/gsc/data/[site]/route.ts`**
- Reads `refresh_token` from `gsc_tokens` for the current user + site
- Refreshes access token if expired
- Calls GSC Search Analytics API for the past 28 days with dimension `['query']`, limit 25
- Returns `{ query, clicks, impressions, position }[]`

**`app/api/gsc/status/[site]/route.ts`**
- Returns `{ connected: boolean }` — checks if a `gsc_tokens` row exists for current user + site

### New component: `components/analytics/gsc-connect-banner.tsx`

- Small banner shown inside a site section when GSC is not connected
- Google icon + text: "Connect Google Search Console to enrich AI insights with keyword data"
- "Connect" button → navigates to `/api/gsc/connect?site=${siteId}`
- When connected: show a small green "GSC Connected" badge instead
- Fetches connection status from `/api/gsc/status/[site]` using SWR

Add `GscConnectBanner` to `site-section.tsx` just below the controls row (date range selector + refresh button), above the stat cards.

### Update `app/api/insights/[site]/route.ts`

Before calling `generateInsights`, attempt to fetch GSC data:

```ts
// Try to fetch GSC keywords if connected
let gscKeywords
try {
  const gscRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/gsc/data/${site}`)
  if (gscRes.ok) gscKeywords = await gscRes.json()
} catch { /* GSC not connected — proceed without it */ }

const result = await generateInsights(siteConfig.name, siteConfig.domain, days, analyticsData, gscKeywords)
```

---

## Phase 3 — Multi-Tenant SaaS

### Architecture overview
- Each **tenant** is a Supabase Auth user
- Tenants configure their own sites (domain, PostHog project ID + API key)
- A **subscription** tier gates features:
  - `free` — 1 site, no AI insights, no GSC
  - `pro` — 5 sites, AI insights, GSC
  - `business` — 20 sites, AI insights, GSC, priority support
- Admin users can view all tenants

### New Supabase tables

```sql
-- Tenant-owned site configuration (replaces hardcoded sites-config.ts)
CREATE TABLE IF NOT EXISTS tenant_sites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id text NOT NULL,
  name text NOT NULL,
  domain text NOT NULL,
  host_filter text NOT NULL,       -- JSON array string or plain domain string
  content_path text NOT NULL DEFAULT '/',
  color text NOT NULL DEFAULT '#6366f1',
  posthog_api_key text,
  posthog_project_id text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, site_id)
);

ALTER TABLE public.tenant_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own sites" ON public.tenant_sites
  FOR ALL USING (auth.uid() = user_id);

-- Subscription tiers
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier text NOT NULL DEFAULT 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own subscription" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

### Migrate existing cache tables to be tenant-scoped

```sql
ALTER TABLE analytics_cache ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE ai_insights_cache ADD COLUMN user_id uuid REFERENCES auth.users(id);

ALTER TABLE analytics_cache DROP CONSTRAINT analytics_cache_site_id_date_range_key;
ALTER TABLE analytics_cache ADD CONSTRAINT analytics_cache_user_site_range_key
  UNIQUE(user_id, site_id, date_range);

ALTER TABLE ai_insights_cache DROP CONSTRAINT ai_insights_cache_site_id_date_range_key;
ALTER TABLE ai_insights_cache ADD CONSTRAINT ai_insights_cache_user_site_range_key
  UNIQUE(user_id, site_id, date_range);
```

### New pages

**`app/(dashboard)/settings/page.tsx`**
- Section: **My Sites** — list from `tenant_sites`, edit/delete, "Add Site" button
- Section: **PostHog Connection** — per-site PostHog API key + Project ID
- Section: **Subscription** — current tier display, "Upgrade" button to Stripe Checkout

**`app/(dashboard)/settings/sites/new/page.tsx`**
- Form fields: site name, domain, host filter, content path, accent color picker, PostHog Project ID, PostHog API Key
- On submit: insert into `tenant_sites`, redirect to settings

**`app/onboarding/page.tsx`** — First-time setup wizard
- Step 1: Enter your first site domain
- Step 2: PostHog snippet install instructions (static how-to)
- Step 3: Enter PostHog API key + Project ID
- Step 4: Done — redirect to dashboard

### Changes to existing API routes

**`app/api/analytics/[site]/route.ts`**
- Read `user_id` from Supabase server session
- Look up `posthog_api_key` and `posthog_project_id` from `tenant_sites` row instead of env vars
- Include `user_id` in all Supabase cache reads/writes

**`app/api/analytics/prefetch/route.ts`**
- Still protected by `CRON_SECRET`
- Loop over all active rows in `tenant_sites` instead of hardcoded `sitesConfig`
- Use per-tenant PostHog credentials from each row

**`app/(dashboard)/page.tsx`**
- Load sites from `tenant_sites` for the current authenticated user
- Pass the dynamic site config to `SiteSection` (same shape as existing `SiteConfig`)

### Feature gating

Create `lib/subscription.ts`:

```ts
export const PLAN_LIMITS = {
  free:     { maxSites: 1,  aiInsights: false, gsc: false },
  pro:      { maxSites: 5,  aiInsights: true,  gsc: true  },
  business: { maxSites: 20, aiInsights: true,  gsc: true  },
}

export async function getUserPlan(userId: string): Promise<keyof typeof PLAN_LIMITS> {
  // query subscriptions table, return tier or 'free' as default
}
```

Gate `AiInsightsCard` and `GscConnectBanner` on plan. Show an "Upgrade to Pro" prompt for free users.

### Stripe integration

Install Stripe:
```bash
pnpm add stripe @stripe/stripe-js
```

New env vars:
```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_PRO_PRICE_ID=price_...
```

New API routes:
- **`app/api/stripe/checkout/route.ts`** — Creates Stripe Checkout session, redirects user to payment
- **`app/api/stripe/webhook/route.ts`** — Handles `checkout.session.completed` and `customer.subscription.deleted`, updates `subscriptions` table accordingly

---

## Phase 4 — WordPress Plugin (Optional)

A lightweight WordPress plugin that:
1. Injects the PostHog JS snippet into `wp_head` (configured via WP plugin settings page with an API key field)
2. Embeds an `<iframe>` pointing to `https://your-saas.com/embed/[siteId]?token=[jwt]` in the WP admin dashboard under a new "Analytics" menu item

The embed route (`app/embed/[siteId]/page.tsx`) is a stripped-down version of the site dashboard — no sidebar, no auth redirect — validates a signed JWT in the query param instead of Supabase session.

---

## Build Order Summary

```
Phase 1 — AI Insights (PostHog only):
  1. Install @anthropic-ai/sdk
  2. Create ai_insights_cache table in Supabase
  3. Create lib/ai-insights.ts
  4. Create app/api/insights/[site]/route.ts
  5. Create components/analytics/ai-insights-card.tsx
  6. Add AiInsightsCard to components/analytics/site-section.tsx
  7. Add ANTHROPIC_API_KEY to .env.local and Vercel

Phase 2 — GSC Integration:
  1. Install googleapis
  2. Create gsc_tokens table in Supabase
  3. Create Google OAuth app in Google Cloud Console
  4. Create app/api/gsc/connect/route.ts
  5. Create app/api/gsc/callback/route.ts
  6. Create app/api/gsc/data/[site]/route.ts
  7. Create app/api/gsc/status/[site]/route.ts
  8. Create components/analytics/gsc-connect-banner.tsx
  9. Add GscConnectBanner to components/analytics/site-section.tsx
  10. Update app/api/insights/[site]/route.ts to pull GSC data
  11. Add GOOGLE_* env vars to .env.local and Vercel

Phase 3 — Multi-tenant:
  1. Create tenant_sites + subscriptions tables in Supabase
  2. Migrate analytics_cache and ai_insights_cache to include user_id
  3. Build app/onboarding/page.tsx
  4. Build app/(dashboard)/settings/page.tsx
  5. Build app/(dashboard)/settings/sites/new/page.tsx
  6. Update app/api/analytics/[site]/route.ts to use per-tenant credentials
  7. Update app/api/analytics/prefetch/route.ts to loop tenant_sites
  8. Update app/(dashboard)/page.tsx to load sites from DB
  9. Create lib/subscription.ts
  10. Install Stripe + create checkout/webhook routes
  11. Gate AiInsightsCard and GscConnectBanner on plan tier

Phase 4 — WordPress Plugin (optional):
  1. Create app/embed/[siteId]/page.tsx (JWT-authenticated iframe embed)
  2. Build WordPress plugin (PHP) with settings page + admin iframe embed
```

---

## Design System Notes (for v0 component generation)

- **Component library:** shadcn/ui (already installed)
- **Icons:** lucide-react (already installed) — use `Sparkles` for AI insights, `TrendingUp` / `AlertTriangle` / `Lightbulb` / `BarChart2` for insight type icons
- **Colors:** Match existing site section accent colors. AI card uses `bg-card` with a thin top border in the site's accent color
- **Loading states:** Use shadcn `Skeleton` component (already used in existing metric cards)
- **Typography:** `text-card-foreground` for primary text, `text-muted-foreground` for secondary/labels
- **Spacing:** Existing cards use `p-4` or `p-6`, `space-y-6` between sections inside a site section
- **Dark mode:** All colors must use CSS variables, not hardcoded hex values

---

## Important Implementation Notes

- Do not modify `lib/sites-config.ts` in Phase 3 — it becomes legacy. New code reads from `tenant_sites` DB table instead.
- Do not change the existing PostHog HogQL query logic in `app/api/analytics/[site]/route.ts` — it works correctly. Only add the tenant credential lookup at the top.
- `createAdminClient()` uses the service role key and bypasses RLS — use it only in server-side API routes, never in client components.
- All API route responses must include `Cache-Control: no-store` to prevent Vercel edge caching.
- `export const maxDuration = 300` is required on any route that calls PostHog. Use `maxDuration = 60` for Claude API routes.
- SWR refresh pattern: use `isManualRefreshing` via `useState` (not SWR's `isValidating`) so refresh buttons don't disable on initial mount.
