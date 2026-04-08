'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { DateRange as DayPickerRange } from 'react-day-picker'
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

const SINGLE_RE = /^\d{4}-\d{2}-\d{2}$/
const RANGE_RE = /^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/

function parseToPickerRange(value: DateRange): DayPickerRange | undefined {
  if (SINGLE_RE.test(value)) {
    const d = new Date(value + 'T12:00:00')
    return { from: d, to: d }
  }
  const m = value.match(RANGE_RE)
  if (m) {
    return {
      from: new Date(m[1] + 'T12:00:00'),
      to: new Date(m[2] + 'T12:00:00'),
    }
  }
  return undefined
}

function getLabel(value: DateRange): string {
  const preset = PRESETS.find((p) => p.value === value)
  if (preset) return preset.label
  if (SINGLE_RE.test(value)) {
    try { return format(new Date(value + 'T12:00:00'), 'EEE, MMM d') } catch { return value }
  }
  const m = value.match(RANGE_RE)
  if (m) {
    try {
      const from = format(new Date(m[1] + 'T12:00:00'), 'MMM d')
      const to = format(new Date(m[2] + 'T12:00:00'), 'MMM d')
      return from === to ? from : `${from} – ${to}`
    } catch { return value }
  }
  return value
}

interface DateRangeSelectProps {
  value: DateRange
  onChange: (value: DateRange) => void
}

export function DateRangeSelect({ value, onChange }: DateRangeSelectProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<DayPickerRange | undefined>(undefined)

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setPending(parseToPickerRange(value))
    setOpen(isOpen)
  }

  const handleRangeSelect = (range: DayPickerRange | undefined) => {
    if (!range) return
    setPending(range)
    if (range.from && range.to) {
      const from = format(range.from, 'yyyy-MM-dd')
      const to = format(range.to, 'yyyy-MM-dd')
      onChange(from === to ? from : `${from}_${to}`)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[175px] justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm">{getLabel(value)}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      {/* Responsive: stacks vertically on mobile, side-by-side on sm+ */}
      <PopoverContent
        className="w-[min(calc(100vw-1rem),380px)] p-0 sm:w-auto"
        align="start"
      >
        <div className="flex flex-col sm:flex-row">
          {/* Presets */}
          <div className="flex flex-row flex-wrap gap-1 p-2 sm:flex-col sm:pr-3">
            <p className="w-full px-2 pb-1 text-xs font-medium text-muted-foreground">
              Quick select
            </p>
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
          </div>

          {/* Calendar */}
          <div className="border-t sm:border-l sm:border-t-0">
            <p className="px-3 pt-2 text-xs font-medium text-muted-foreground">
              {pending?.from && !pending?.to
                ? 'Now pick an end date'
                : 'Pick a date or range'}
            </p>
            <Separator className="mt-2" />
            <Calendar
              mode="range"
              selected={pending}
              onSelect={handleRangeSelect}
              disabled={(date) => date > new Date()}
              numberOfMonths={1}
              initialFocus
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
