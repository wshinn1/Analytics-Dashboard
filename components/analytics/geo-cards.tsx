'use client'

import { Card, Title, BarList, DonutChart, Legend } from '@tremor/react'

interface GeoCardsProps {
  topCountries: { country: string; views: number }[]
  topStates: { state: string; views: number }[]
  topCities: { city: string; views: number }[]
  isLoading?: boolean
}

export function GeoCards({ topCountries, topStates, topCities, isLoading }: GeoCardsProps) {
  const countryData = topCountries.map((item) => ({
    name: item.country,
    value: item.views,
  }))

  const stateData = topStates.map((item) => ({
    name: item.state,
    value: item.views,
  }))

  const cityData = topCities.map((item) => ({
    name: item.city,
    value: item.views,
  }))

  const donutData = topCountries.slice(0, 5).map((item) => ({
    name: item.country,
    views: item.views,
  }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Countries with Donut Chart */}
      <Card className="p-6">
        <Title>Top Countries</Title>
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        ) : donutData.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <span className="text-muted-foreground">No data available</span>
          </div>
        ) : (
          <div className="mt-4">
            <DonutChart
              data={donutData}
              category="views"
              index="name"
              colors={['blue', 'cyan', 'indigo', 'violet', 'fuchsia']}
              className="h-40"
              valueFormatter={(value) => value.toLocaleString()}
            />
            <Legend
              categories={donutData.map((d) => d.name)}
              colors={['blue', 'cyan', 'indigo', 'violet', 'fuchsia']}
              className="mt-4 justify-center"
            />
          </div>
        )}
      </Card>

      {/* States */}
      <Card className="p-6">
        <Title>Top States/Regions</Title>
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        ) : stateData.length === 0 ? (
          <div className="flex h-48 items-center justify-center">
            <span className="text-muted-foreground">No data available</span>
          </div>
        ) : (
          <BarList data={stateData} className="mt-4" />
        )}
      </Card>

      {/* Cities */}
      <Card className="p-6 lg:col-span-2">
        <Title>Top Cities</Title>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        ) : cityData.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <span className="text-muted-foreground">No data available</span>
          </div>
        ) : (
          <BarList data={cityData} className="mt-4" />
        )}
      </Card>
    </div>
  )
}
