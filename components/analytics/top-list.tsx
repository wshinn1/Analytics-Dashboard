'use client'

import { Card, Title, BarList } from '@tremor/react'

interface TopListProps {
  title: string
  data: { name: string; value: number }[]
  isLoading?: boolean
}

export function TopList({ title, data, isLoading }: TopListProps) {
  return (
    <Card className="p-6">
      <Title>{title}</Title>
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <span className="text-muted-foreground">No data available</span>
        </div>
      ) : (
        <BarList data={data} className="mt-4" />
      )}
    </Card>
  )
}
