"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Flag, Pencil } from 'lucide-react'
import { useLifeGraph } from '@/hooks/use-lifegraph'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '../ui/input'

export function GoalTracker() {
  const { goal, setGoal } = useLifeGraph()
  const [isEditing, setIsEditing] = useState(false)
  const [newTarget, setNewTarget] = useState(goal.target)

  const progress = goal.target > 0 ? Math.min((goal.achieved / goal.target) * 100, 100) : 0

  const handleSave = () => {
    setGoal({ ...goal, target: newTarget })
    setIsEditing(false)
  }

  return (
    <Card className="bg-card/50 backdrop-blur-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
                <Flag className="text-primary" />
                Goal Tracker
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
        </div>
        <CardDescription>Set a score target and track your progress.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
            <div className="flex items-center gap-2">
                <Input type="number" value={newTarget} onChange={(e) => setNewTarget(Number(e.target.value))} className="bg-background"/>
                <Button onClick={handleSave}><CheckCircle className="h-4 w-4"/></Button>
            </div>
        ) : (
            <>
                <div className="flex justify-between items-baseline">
                    <p className="text-sm font-medium">Progress</p>
                    <p className="text-lg font-bold">
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            {goal.achieved}
                        </motion.span>
                        <span className="text-sm font-normal text-muted-foreground"> / {goal.target}</span>
                    </p>
                </div>
                <div>
                    <Progress value={progress} className="h-3" />
                    <p className="text-right text-xs text-muted-foreground mt-1">{progress.toFixed(0)}% complete</p>
                </div>
            </>
        )}
      </CardContent>
    </Card>
  )
}
