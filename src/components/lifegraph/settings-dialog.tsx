"use client"

import React from 'react'
import { Settings } from 'lucide-react'
import { useLifeGraph } from '@/hooks/use-lifegraph'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import type { HistoryCompaction } from '@/lib/types'

export function SettingsDialog() {
  const { settings, setSettings } = useLifeGraph()

  const handleCompactionChange = (value: string) => {
    setSettings({ ...settings, historyCompaction: value as HistoryCompaction });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your application settings.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>History Compaction</Label>
                <p className="text-sm text-muted-foreground">
                    Automatically summarize old action entries to save space. 
                    This will replace action descriptions with a single compacted score for the period.
                </p>
            </div>
            <RadioGroup
                value={settings.historyCompaction}
                onValueChange={handleCompactionChange}
                defaultValue="never"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="never" id="never" />
                    <Label htmlFor="never">Never</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <Label htmlFor="weekly">Summarize Weekly</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly">Summarize Monthly</Label>
                </div>
            </RadioGroup>
        </div>
      </DialogContent>
    </Dialog>
  )
}
