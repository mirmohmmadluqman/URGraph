"use client"

import { URGraphHeader } from './urgraph-header'
import { ActionLogger } from './action-logger'
import { URGraphChart } from './urgraph-chart'
import { DashboardStats } from './dashboard-stats'
import { ActionHistory } from './action-history'
import { GoalTracker } from './goal-tracker'

export function URGraphPage() {
  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <URGraphHeader />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="grid gap-8 grid-cols-1 lg:grid-cols-3 xl:grid-cols-4">
          <div className="lg:col-span-2 xl:col-span-3 space-y-8">
            <URGraphChart />
            <ActionHistory />
          </div>
          <div className="lg:col-span-1 xl:col-span-1 space-y-8">
            <ActionLogger />
            <DashboardStats />
            <GoalTracker />
          </div>
        </div>
      </main>
    </div>
  )
}
