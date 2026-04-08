# Analytics Dashboard

A private, self-hosted analytics dashboard that aggregates traffic data from PostHog across all your personal websites and displays it in one place. Built with Next.js, hosted on Vercel, and backed by Supabase for caching and authentication.

![Next.js](https://img.shields.io/badge/Next.js-App_Router-black) ![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_Cache-green) ![PostHog](https://img.shields.io/badge/PostHog-Analytics-orange) ![Mapbox](https://img.shields.io/badge/Mapbox-Maps-blue) ![Vercel](https://img.shields.io/badge/Vercel-Deployment-black)

---

## Overview

This dashboard provides a unified view of traffic and engagement across multiple personal websites. Rather than logging into PostHog directly, this system queries PostHog's HogQL API, caches the results in Supabase, and serves them instantly on every page load. Data is refreshed automatically on a daily schedule and can also be updated manually per site.

---

## Sites Tracked

| Site | Domain |
|------|--------|
| The Adopted Son | theadoptedson.com |
| Tekton's Table | tektonstable.com |
| Fullstack | fullstack.wesshinn.com |
| Wes Shinn | wesshinn.com |
| Portfolio | portfolio.wesshinn.com |

Sites are configured in `lib/sites-config.ts` and can be added or removed at any time.

---

## Features

- **Multi-site dashboard** — all sites visible on one page, each in a collapsible section
- **Instant page loads** — data is served from Supabase cache, not fetched live from PostHog on every visit
- **Scheduled cache updates** — Vercel cron jobs refresh all site data automatically at 4 AM, 1 PM, and 6 PM EST daily
- **Manual refresh** — per-site Refresh button fetches live data from PostHog on demand and updates the cache
- **Last updated timestamp** — each site shows when its data was last refreshed
- **Date range filtering** — switch between Last 24 Hours, Last 7 Days, and Last 30 Days per site
- **Auth-protected** — login required via Supabase email/password authentication

### Metrics Per Site

| Metric | Description |
|--------|-------------|
| Page Views | Total pageview events in the selected date range |
| Unique Visitors | Distinct visitor count |
| Active Users | Visitors active in the last 5 minutes |
| Bounce Rate | Percentage of single-page sessions |
| New vs Returning | First-time vs repeat visitors |
| Top Pages | Most visited URLs across the site |
| Top Posts | Most visited URLs within the configured content path (e.g. `/blog/`, `/devotionals/`) |
| Traffic Sources | Where visitors came from (direct, referrers, social, etc.) |
| Devices & Browsers | Breakdown of device types and browser usage |
| Countries / States / Cities | Geographic breakdown of visitors |
| Interactive Map | Mapbox map with pins for each city that has sent traffic |
| Traffic Chart | Hourly (24h) or daily (7d/30d) area chart of pageviews |

---

## How It Works

### Data Flow

1. **PostHog** is embedded on each tracked website and collects `$pageview` events, including device, browser, referrer, and geolocation data
2. On a **manual Refresh** or scheduled **cron job**, the `/api/analytics/[site]` route is called with `?refresh=true`
3. The API route runs a series of **HogQL queries** against PostHog's API to fetch all metrics for that site and date range
4. Results are written to the **Supabase `analytics_cache` table** (upsert by site + date range)
5. On **normal page load**, the dashboard fetches `/api/analytics/all-cached?days=7` which reads all sites from Supabase in a single query — no PostHog calls made
6. If a user switches to a different date range (24h, 30d), the per-site API is called and serves from Supabase cache for that range
7. The **Refresh button** always bypasses the cache and fetches live from PostHog, then updates the cache

### Caching Strategy

- **Supabase** is the primary cache store (server-side, shared across all devices)
- On page load, one bulk API call reads all sites' cached data in a single Supabase query (~100ms)
- Cache entries never expire automatically — they are only updated by cron jobs or manual refreshes
- This ensures pages always load instantly regardless of when they are visited

### Scheduled Updates (Cron Jobs)

Vercel cron jobs call `/api/analytics/prefetch` on the following schedule:

| Time (EST) | UTC |
|------------|-----|
| 4:00 AM | 09:00 |
| 1:00 PM | 17:00 |
| 6:00 PM | 22:00 |

The prefetch endpoint loops through every site × date range combination (5 sites × 3 ranges = 15 total) sequentially, calling the analytics API with `?refresh=true` for each. All results are written to Supabase. The prefetch is protected by a `CRON_SECRET` authorization header that Vercel sends automatically.

### HogQL Query Design

PostHog is queried using HogQL (ClickHouse-based SQL). Key design decisions:

- **Host filtering** uses `position(properties['$host'], 'domain.com') > 0` instead of `LIKE '%domain.com'` — leading wildcards don't work in HogQL
- Sites with subdomains (e.g. `wesshinn.com` and `www.wesshinn.com`) use an array host filter with exact `=` matching
- **Referrer exclusion** strips internal traffic by computing the base domain from the site config
- Queries are batched into 5 groups with small delays to avoid rate limiting

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| UI Components | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://radix-ui.com) |
| Charts | [Recharts](https://recharts.org) |
| Maps | [Mapbox GL](https://mapbox.com) via [react-map-gl](https://visgl.github.io/react-map-gl) |
| Analytics Source | [PostHog](https://posthog.com) (HogQL API) |
| Cache Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Authentication | [Supabase](https://supabase.com) Auth |
| Data Fetching | [SWR](https://swr.vercel.app) |
| Deployment | [Vercel](https://vercel.com) |
| Scheduled Jobs | Vercel Cron Jobs |

---

## Project Structure

```
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Auth-protected layout with sidebar
│   │   └── page.tsx                # Main dashboard page (loads bulk cache)
│   ├── api/
│   │   └── analytics/
│   │       ├── [site]/route.ts     # Per-site analytics API (cache + PostHog)
│   │       ├── all-cached/route.ts # Bulk cache read for all sites
│   │       └── prefetch/route.ts   # Cron endpoint to refresh all caches
│   ├── login/page.tsx              # Login page
│   └── signup/page.tsx             # Signup (disabled after initial setup)
├── components/
│   └── analytics/
│       ├── site-section.tsx        # Collapsible per-site section with controls
│       ├── stat-cards.tsx          # Page views, visitors, geo counts
│       ├── insight-cards.tsx       # Bounce rate, new vs returning
│       ├── traffic-chart.tsx       # Hourly/daily area chart
│       ├── traffic-sources.tsx     # Referrer breakdown
│       ├── device-cards.tsx        # Device and browser breakdown
│       ├── top-list.tsx            # Top pages and top posts
│       ├── geo-cards.tsx           # Countries, states, cities
│       ├── visitor-map.tsx         # Mapbox interactive map
│       └── date-range-select.tsx   # 24h / 7d / 30d selector
├── hooks/
│   └── use-analytics.ts            # SWR hook for per-site data fetching
└── lib/
    ├── analytics-types.ts          # TypeScript interfaces for analytics data
    ├── sites-config.ts             # Site definitions (domain, hostFilter, color)
    └── supabase/
        ├── client.ts               # Browser Supabase client
        ├── server.ts               # Server Supabase client
        ├── admin.ts                # Service role client for cache operations
        └── middleware.ts           # Auth middleware (protects dashboard routes)
```

---

## Setup

### Prerequisites

- [PostHog](https://posthog.com) account with the JS snippet installed on each site you want to track
- [Supabase](https://supabase.com) project
- [Mapbox](https://mapbox.com) account for the visitor map
- [Vercel](https://vercel.com) account for deployment and cron jobs

### 1. Supabase Database

Run the following in your Supabase **SQL Editor** to create the cache table:

```sql
CREATE TABLE IF NOT EXISTS analytics_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id text NOT NULL,
  date_range text NOT NULL,
  data jsonb NOT NULL,
  cached_at timestamptz NOT NULL,
  UNIQUE(site_id, date_range)
);

-- Enable RLS and block all public access
-- (service role key bypasses RLS, so your server-side code still works)
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access" ON public.analytics_cache
  FOR ALL USING (false);
```

### 2. Environment Variables

Create a `.env.local` file:

```env
# PostHog
POSTHOG_PERSONAL_API_KEY=phx_...
POSTHOG_PROJECT_ID=12345

# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# Supabase (server only — service role for cache reads/writes)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# App URL (used by cron jobs for internal API calls)
NEXT_PUBLIC_APP_URL=https://your-analytics-domain.com

# Cron job protection
CRON_SECRET=your-random-secret

# Mapbox (optional — map won't render without it)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
```

### 3. Installation

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Create Admin Account

The signup page is disabled after initial setup. To create your account:

1. Go to **Supabase dashboard → Authentication → Users**
2. Click **Add user → Create new user**
3. Enter your email and password

### 5. Deploy to Vercel

```bash
vercel deploy
```

Add all environment variables to **Vercel → Settings → Environment Variables**, then redeploy.

Also:
- Set the **Site URL** in Supabase under **Authentication → URL Configuration** to your production domain
- Restrict your Mapbox token to your production domain under **Mapbox → Access Tokens**

### 6. Seed the Cache

After deploying, go to **Vercel → Settings → Cron Jobs** and click **Run** to manually trigger the first cache population. Alternatively, open the dashboard and click **Refresh** on each site.

---

## Adding a New Site

Edit `lib/sites-config.ts`:

```ts
{
  id: 'mysite',                  // unique ID, used in API routes and cache keys
  name: 'My Site',               // display name shown in the dashboard
  domain: 'mysite.com',          // shown as subtitle under the site name
  hostFilter: 'mysite.com',      // matched against PostHog $host property
  contentPath: '/blog/',         // path prefix used to filter "Top Posts"
  color: '#6366f1',              // accent color for the site section
}
```

For sites with both `www` and non-www variants, use an array:

```ts
hostFilter: ['mysite.com', 'www.mysite.com']
```

After adding a site, click **Refresh** on it in the dashboard to populate its cache for the first time.

---

## Cron Job Schedule

| Time (EST) | Time (UTC) | Purpose |
|------------|------------|---------|
| 4:00 AM | 09:00 | Overnight refresh |
| 1:00 PM | 17:00 | Midday refresh |
| 6:00 PM | 22:00 | Evening refresh |

Cron jobs are configured in `vercel.json` and require the **Vercel Pro** plan to run reliably. Each run fetches fresh data from PostHog for all sites across all three date ranges (15 total operations) and writes results to Supabase.

---

## License

MIT
