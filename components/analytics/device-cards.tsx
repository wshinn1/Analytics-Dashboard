'use client'

import { Card, Title } from '@tremor/react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const DEVICE_COLORS: Record<string, string> = {
  Desktop: '#6366f1',
  Mobile: '#8b5cf6',
  Tablet: '#06b6d4',
}

const BROWSER_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#94a3b8']

interface DeviceCardsProps {
  devices: { device: string; views: number }[]
  browsers: { browser: string; views: number }[]
  isLoading?: boolean
}

export function DeviceCards({ devices, browsers, isLoading }: DeviceCardsProps) {
  const deviceData = devices.map((d) => ({ name: d.device, value: d.views }))
  const browserData = browsers.map((b) => ({ name: b.browser, value: b.views }))

  const loading = (
    <div className="flex h-48 items-center justify-center">
      <span className="text-muted-foreground">Loading...</span>
    </div>
  )

  const empty = (
    <div className="flex h-48 items-center justify-center">
      <span className="text-muted-foreground">No data available</span>
    </div>
  )

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-6">
        <Title>Devices</Title>
        {isLoading ? loading : deviceData.length === 0 ? empty : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={deviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" isAnimationActive>
                {deviceData.map((entry, i) => (
                  <Cell key={i} fill={DEVICE_COLORS[entry.name] || BROWSER_COLORS[i % BROWSER_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-6">
        <Title>Browsers</Title>
        {isLoading ? loading : browserData.length === 0 ? empty : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={browserData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" isAnimationActive>
                {browserData.map((_, i) => (
                  <Cell key={i} fill={BROWSER_COLORS[i % BROWSER_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}
