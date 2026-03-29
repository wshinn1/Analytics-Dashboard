'use client'

import { Card, Metric, Text } from '@tremor/react'
import { Eye, Users, Globe, MapPin, Building2 } from 'lucide-react'

interface StatCardsProps {
  pageviews: number
  uniqueVisitors: number
  countriesCount: number
  statesCount: number
  citiesCount: number
  isLoading?: boolean
}

export function StatCards({
  pageviews,
  uniqueVisitors,
  countriesCount,
  statesCount,
  citiesCount,
  isLoading,
}: StatCardsProps) {
  const stats = [
    {
      title: 'Page Views',
      value: pageviews,
      icon: Eye,
    },
    {
      title: 'New Sessions',
      value: uniqueVisitors,
      icon: Users,
    },
    {
      title: 'Countries',
      value: countriesCount,
      icon: Globe,
    },
    {
      title: 'States',
      value: statesCount,
      icon: MapPin,
    },
    {
      title: 'Cities',
      value: citiesCount,
      icon: Building2,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card key={stat.title} className="p-4">
          <div className="flex items-center gap-2">
            <stat.icon className="h-4 w-4 text-muted-foreground" />
            <Text>{stat.title}</Text>
          </div>
          <Metric className="mt-2">
            {isLoading ? '...' : stat.value.toLocaleString()}
          </Metric>
        </Card>
      ))}
    </div>
  )
}
