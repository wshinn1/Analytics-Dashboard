# Analytics Dashboard

A self-hosted, multi-site web analytics dashboard built with Next.js. Tracks page views, sessions, geographic data, and visitor locations across multiple websites — all powered by PostHog for event collection and visualized with Recharts and Mapbox.

![Dashboard](https://img.shields.io/badge/Next.js-16-black) ![Supabase](https://img.shields.io/badge/Supabase-Auth-green) ![PostHog](https://img.shields.io/badge/PostHog-Analytics-orange) ![Mapbox](https://img.shields.io/badge/Mapbox-Maps-blue)

## Features

- **Multi-site support** — monitor multiple websites from a single dashboard
- **Traffic overview** — page views, unique sessions, active users (live 5-min window)
- **Top pages & posts** — see which content drives the most traffic
- **Geographic breakdown** — countries, states, and cities with colored bar charts
- **Interactive visitor map** — Mapbox map with pins for every city that has visited
- **Date range filtering** — last 24h, 7 days, or 30 days
- **Auto-refresh** — data refreshes every 30 seconds
- **Auth-protected** — Supabase authentication, single-admin access
- **Responsive** — works on desktop and mobile

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| UI Components | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://radix-ui.com) |
| Charts | [Recharts](https://recharts.org) |
| Maps | [Mapbox GL](https://mapbox.com) via [react-map-gl](https://visgl.github.io/react-map-gl) |
| Analytics Data | [PostHog](https://posthog.com) (HogQL API) |
| Authentication | [Supabase](https://supabase.com) Auth |
| Deployment | [Vercel](https://vercel.com) |
| Data Fetching | [SWR](https://swr.vercel.app) |
| Initial Scaffolding | [v0.dev](https://v0.dev) |

## How It Works

1. **PostHog** is embedded on each tracked website and collects `$pageview` events including geolocation data (`$geoip_city_name`, `$geoip_country_name`, etc.)
2. The **Next.js API route** (`/api/analytics/[site]`) queries PostHog's HogQL API server-side using your personal API key
3. **City coordinates** for the map are resolved via the Mapbox Geocoding API using city names returned from PostHog
4. The **dashboard client** fetches from the internal API and renders charts and the map
5. **Supabase** handles authentication — only authenticated users can access the dashboard

## Project Structure

```
├── app/
│   ├── (dashboard)/          # Auth-protected dashboard pages
│   │   ├── layout.tsx        # Sidebar layout with auth check
│   │   └── page.tsx          # Main dashboard page
│   ├── api/analytics/[site]/ # PostHog data API route
│   ├── login/                # Login page
│   └── signup/               # Signup (blocked — admin only)
├── components/
│   ├── analytics/
│   │   ├── site-section.tsx  # Per-site collapsible section
│   │   ├── stat-cards.tsx    # Page views, sessions, geo counts
│   │   ├── traffic-chart.tsx # Recharts area chart
│   │   ├── geo-cards.tsx     # Donut + bar charts for geo data
│   │   ├── top-list.tsx      # Top pages / top posts
│   │   └── visitor-map.tsx   # Mapbox interactive map with pins
│   └── dashboard-sidebar.tsx # Responsive sidebar / mobile drawer
├── hooks/
│   └── use-analytics.ts      # SWR data fetching hook
└── lib/
    ├── analytics-types.ts    # TypeScript types for API responses
    ├── sites-config.ts       # Site configuration (domains, content paths)
    └── supabase/             # Supabase client + middleware helpers
```

## Getting Started

### Prerequisites

- [PostHog](https://posthog.com) account with the JS snippet installed on your sites
- [Supabase](https://supabase.com) project for authentication
- [Mapbox](https://mapbox.com) account for the visitor map

### Environment Variables

Create a `.env.local` file in the root:

```env
# PostHog
POSTHOG_PERSONAL_API_KEY=phx_...
POSTHOG_PROJECT_ID=12345

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
```

### Installation

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

### Adding a Site

Edit `lib/sites-config.ts` and add an entry:

```ts
{
  id: 'mysite',              // unique ID used in the API route
  name: 'My Site',           // display name in the UI
  domain: 'mysite.com',      // shown under the site name
  hostFilter: '%mysite.com', // SQL LIKE pattern to match PostHog events
  contentPath: '/blog/',     // path prefix for "Top Posts" filtering
}
```

### Creating an Admin Account

The signup page is intentionally blocked after initial setup. To create your account:

1. Go to your **Supabase project dashboard → Authentication → Users**
2. Click **Add user** and enter your email + password

Or temporarily re-enable the `/signup` route by removing the redirect block in `lib/supabase/middleware.ts`, create your account, then re-add it.

## Deployment

Deploy to Vercel:

```bash
vercel deploy
```

Add all environment variables from `.env.local` to your Vercel project under **Settings → Environment Variables**.

Also make sure to:
- Set the **Site URL** in Supabase under **Authentication → URL Configuration** to your production domain
- Restrict your Mapbox token to your production domain under **Account → Access Tokens**

## License

MIT
