'use client'

import { Card, Title, AreaChart } from '@tremor/react'

interface TrafficChartProps {
  data: { date: string; views: number }[]
  isLoading?: boolean
}

export function TrafficChart({ data, isLoading }: TrafficChartProps) {
  const chartData = data.map((item) => ({
    date: item.date,
    'Page Views': item.views,
  }))

  return (
    <Card className="p-6">
      <Title>Traffic Overview</Title>
      {isLoading ? (
        <div className="flex h-72 items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <AreaChart
          className="mt-4 h-72"
          data={chartData}
          index="date"
          categories={['Page Views']}
          colors={['blue']}
          valueFormatter={(value) => value.toLocaleString()}
          showAnimation
          curveType="monotone"
        />
      )}
    </Card>
  )
}
