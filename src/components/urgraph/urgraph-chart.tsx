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
  ReferenceLine
} from 'recharts'
import { useURGraph } from '@/hooks/use-urgraph'
import type { TimeRange } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL']

export function URGraphChart() {
  const { graphData, timeRange, setTimeRange } = useURGraph()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-background/80 backdrop-blur-sm p-2 shadow-sm">
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
                Total Score
              </span>
              <span className="font-bold text-foreground">
                {data.value > 0 ? `+${data.value}` : data.value}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }
  
  const gradientId = "splitColor";
  const maxScore = Math.max(...graphData.map(d => d.value), 0);
  const minScore = Math.min(...graphData.map(d => d.value), 0);
  
  // Ensure y-axis isn't flat if all values are the same
  const yAxisPadding = Math.max(Math.abs(maxScore - minScore) * 0.1, 5);
  const yAxisDomain: [number, number] = [
    Math.floor(minScore - yAxisPadding),
    Math.ceil(maxScore + yAxisPadding),
  ];
  
  const gradientOffset = () => {
    if (yAxisDomain[1] <= 0) return 1;
    if (yAxisDomain[0] >= 0) return 0;
    return yAxisDomain[1] / (yAxisDomain[1] - yAxisDomain[0]);
  };
  const off = gradientOffset();

  return (
    <Card className="bg-card/50 backdrop-blur-lg shadow-xl">
      <CardHeader>
        <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="text-primary" />
                    Your Progress
                </CardTitle>
                <CardDescription>Visual representation of your daily score over time.</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
                 <AreaChart data={graphData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} id="urgraph-chart-svg">
                 <defs>
                   <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset={off} stopColor="hsl(var(--positive))" stopOpacity={0.4} />
                      <stop offset={off} stopColor="hsl(var(--negative))" stopOpacity={0.4} />
                   </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                        <feOffset in="blur" dx="2" dy="2" result="offsetBlur" />
                        <feMerge>
                            <feMergeNode in="offsetBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                 </defs>
                 <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} stroke="hsl(var(--foreground))"/>
                 <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} domain={yAxisDomain} stroke="hsl(var(--foreground))"/>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                 <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                 <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeDasharray="3 3" />
                 <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill={`url(#${gradientId})`} style={{filter:'url(#shadow)'}} />
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
