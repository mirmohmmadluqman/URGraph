"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Target, Star, CalendarDays } from 'lucide-react'
import { useURGraph } from '@/hooks/use-urgraph'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'


const StatCard = ({ icon, title, value, unit, tooltip }: { icon: React.ReactNode, title: string, value: string | number, unit?: string, tooltip: string }) => (
  <TooltipProvider>
    <Tooltip>
        <TooltipTrigger asChild>
            <Card className="bg-card/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className="text-muted-foreground">{icon}</div>
                </CardHeader>
                <CardContent>
                <motion.div
                    key={value.toString()}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="text-2xl font-bold"
                >
                    {value}
                    {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
                </motion.div>
                </CardContent>
            </Card>
        </TooltipTrigger>
        <TooltipContent>
            <p>{tooltip}</p>
        </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

export function DashboardStats() {
  const { stats } = useURGraph()

  return (
    <div>
        <h3 className="text-lg font-semibold mb-4 text-foreground/80">Daily Stats</h3>
        <div className="grid grid-cols-2 gap-4">
            <StatCard 
                icon={<Target className="h-4 w-4" />} 
                title="Today's Score" 
                value={stats.dailyScore > 0 ? `+${stats.dailyScore}` : stats.dailyScore}
                tooltip="Total score from actions logged today."
            />
            <StatCard 
                icon={<CalendarDays className="h-4 w-4" />} 
                title="Today's Actions" 
                value={stats.dailyActions} 
                tooltip="Number of actions logged today."
            />
            <StatCard 
                icon={<TrendingUp className="h-4 w-4" />} 
                title="Avg. Score" 
                value={stats.avgScore.toFixed(2)}
                tooltip="Average score for the selected time range."
            />
            <StatCard 
                icon={<Star className="h-4 w-4" />} 
                title="Streak" 
                value={stats.streak} 
                unit={stats.streak === 1 ? 'day' : 'days'}
                tooltip="Consecutive days with a positive total score."
            />
        </div>
    </div>
  )
}
