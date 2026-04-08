'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import type { DateRange } from '@/lib/analytics-types'

const PRESETS: { label: string; value: string }[] = [
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
]

function getLabel(value: DateRange): string {
  const preset = PRESETS.find((p) => p.value === value)
  if (preset) return preset.label
  // Custom date string YYYY-MM-DD
  try {
    return format(new Date(value + 'T12:00:00'), 'EEE, MMM d')
  } catch {
    return value
  }
}

interface DateRangeSelectProps {
  value: DateRange
  onChange: (value: DateRange) => void
}

export function DateRangeSelect({ value, onChange }: DateRangeSelectProps) {
  const [open, setOpen] = useState(false)

  const isCustomDate = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const selectedDate = isCustomDate ? new Date(value + 'T12:00:00') : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[160px] justify-between gap-2">
          <span className="flex items-center gap-2 truncate">
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{getLabel(value)}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets */}
          <div className="flex flex-col gap-1 p-2 pr-3">
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Quick select</p>
            {PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant={value === preset.value ? 'secondary' : 'ghost'}
                size="sm"
                className="justify-start text-sm"
                onClick={() => {
                  onChange(preset.value as DateRange)
                  setOpen(false)
                }}
              >
                {preset.label}
              </Button>
            ))}
            <Separator className="my-1" />
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Pick a day</p>
          </div>

          {/* Calendar */}
          <div className="border-l">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onChange(format(date, 'yyyy-MM-dd'))
                  setOpen(false)
                }
              }}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
