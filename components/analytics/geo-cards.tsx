'use client'

import { Card, Title } from '@tremor/react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']

interface GeoCardsProps {
  topCountries: { country: string; views: number }[]
  topStates: { state: string; views: number }[]
  topCities: { city: string; views: number }[]
  isLoading?: boolean
}

function ColoredBarList({ data, color }: { data: { name: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="mt-4 space-y-2">
      {data.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-sm">
          <div className="relative h-7 flex-1 overflow-hidden rounded" style={{ background: '#f3f4f6' }}>
            <div
              className="absolute left-0 top-0 h-full rounded"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color, opacity: 0.25 }}
            />
            <span className="relative pl-2 leading-7 text-gray-700">{item.name}</span>
          </div>
          <span className="w-8 text-right font-medium text-gray-600">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export function GeoCards({ topCountries, topStates, topCities, isLoading }: GeoCardsProps) {
  const donutData = topCountries.slice(0, 5).map((item) => ({
    name: item.country,
    value: item.views,
  }))

  const stateData = topStates.map((item) => ({ name: item.state, value: item.views }))
  const cityData = topCities.map((item) => ({ name: item.city, value: item.views }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Countries Donut */}
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
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                isAnimationActive
              >
                {donutData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
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
          <ColoredBarList data={stateData} color="#8b5cf6" />
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
          <ColoredBarList data={cityData} color="#06b6d4" />
        )}
      </Card>
    </div>
  )
}
