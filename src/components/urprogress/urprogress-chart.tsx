"use client"

import React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useURProgress } from '@/hooks/use-urprogress'
import type { TimeRange } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL']

export function URProgressChart() {
  const { graphData, timeRange, setTimeRange } = useURProgress()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col space-y-1">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Date
              </span>
              <span className="font-bold text-muted-foreground">
                {label}
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Score
              </span>
              <span className="font-bold text-foreground">
                {data.value}
              </span>
            </div>
             <div className="flex flex-col space-y-1">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Daily +/-
              </span>
              <span className={`font-bold ${data.dailyDelta > 0 ? 'text-positive' : data.dailyDelta < 0 ? 'text-negative' : 'text-muted-foreground'}`}>
                {data.dailyDelta > 0 ? `+${data.dailyDelta}` : data.dailyDelta}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-card/50 backdrop-blur-lg shadow-xl">
      <CardHeader>
        <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="text-primary" />
                    Your Progress
                </CardTitle>
                <CardDescription>Visual representation of your life score over time.</CardDescription>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
                {timeRanges.map(range => (
                    <Button
                    key={range}
                    variant={timeRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    >
                    {range}
                    </Button>
                ))}
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {graphData.length > 0 ? (
                 <AreaChart data={graphData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} id="urprogress-chart-svg">
                 <defs>
                   <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                     <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                   </linearGradient>
                    <linearGradient id="lineColor" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4A90E2" />
                        <stop offset="100%" stopColor="#29ABE2" />
                    </linearGradient>
                 </defs>
                 <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                 <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                 <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                 <Area type="monotone" dataKey="value" stroke="url(#lineColor)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
               </AreaChart>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <p className="text-muted-foreground">No data to display.</p>
                        <p className="text-sm text-muted-foreground/80">Log your first action to see the graph.</p>
                    </div>
                </div>
            )}
         
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
