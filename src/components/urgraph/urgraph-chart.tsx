
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
  ReferenceLine,
  Line,
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
      const data = payload[0];
      const prevData = graphData.find((_, i) => graphData[i+1]?.date === label);
      const dailyChange = prevData ? data.value - prevData.value : data.value;

      return (
        <div className="rounded-lg border bg-background/80 backdrop-blur-sm p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2 items-center">
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
             <div className="flex flex-col space-y-1">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Daily Change
              </span>
              <span className={`font-bold ${dailyChange >= 0 ? 'text-positive' : 'text-negative'}`}>
                {dailyChange >= 0 ? `+${dailyChange}` : dailyChange}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }
  
  // Create a new data set for gradient definitions
  const gradientData = React.useMemo(() => {
    if (graphData.length < 2) return [];
    return graphData.slice(1).map((p, i) => {
      const prev = graphData[i];
      return {
        x: `${(i / (graphData.length - 2)) * 100}%`,
        color: p.value >= prev.value ? 'hsl(var(--positive))' : 'hsl(var(--negative))'
      }
    })
  }, [graphData]);

  const yAxisDomain = React.useMemo(() => {
    if (!graphData || graphData.length === 0) {
      return [-5, 5];
    }
    const values = graphData.map(d => d.value);
    const maxScore = Math.max(...values, 0);
    const minScore = Math.min(...values, 0);
    const padding = Math.max((maxScore - minScore) * 0.1, 5);
    return [Math.floor(minScore - padding), Math.ceil(maxScore + padding)];
  }, [graphData]);


  return (
    <Card className="bg-card/50 backdrop-blur-lg shadow-xl">
      <CardHeader>
        <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="text-primary" />
                    Your Progress
                </CardTitle>
                <CardDescription>Visual representation of your cumulative score over time.</CardDescription>
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
            {graphData.length > 1 ? (
                 <AreaChart data={graphData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} id="urgraph-chart-svg">
                 <defs>
                    <linearGradient id="splitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="50%" stopColor="hsl(var(--positive))" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="hsl(var(--negative))" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="dynamicGradient" x1="0" y1="0" x2="1" y2="0">
                      {gradientData.map((d, i) => <stop key={i} offset={d.x} stopColor={d.color} stopOpacity={0.4} />)}
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                        <feOffset in="blur" dx="1" dy="4" result="offsetBlur" />
                         <feComponentTransfer in="offsetBlur" result="feComponentTransfer">
                            <feFuncA type="linear" slope="0.5" />
                        </feComponentTransfer>
                        <feMerge>
                            <feMergeNode in="feComponentTransfer"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                 </defs>
                 <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" dy={10} />
                 <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} domain={yAxisDomain} stroke="hsl(var(--foreground))" dx={-5} />
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                 <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                 <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeOpacity={0.2} strokeDasharray="3 3" />
                 <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#dynamicGradient)" 
                    style={{filter:'url(#shadow)'}} 
                 />
               </AreaChart>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <p className="text-muted-foreground">Log actions on at least two different days to see the graph.</p>
                        <p className="text-sm text-muted-foreground/80">A chart needs more than one point to draw a line.</p>
                    </div>
                </div>
            )}
         
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
