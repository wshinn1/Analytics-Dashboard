export interface AnalyticsData {
  pageviews: number
  uniqueVisitors: number
  activeUsers: number
  topPages: { path: string; views: number }[]
  topPosts: { path: string; views: number }[]
  dailyViews: { date: string; views: number }[]
  topCountries: { country: string; views: number }[]
  topCities: { city: string; views: number }[]
  topStates: { state: string; views: number }[]
  mapLocations: { lat: number; lng: number; city: string; country: string; views: number }[]
}

export type DateRange = '24h' | '7' | '30'
