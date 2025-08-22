"use client"

import type { ReactNode } from 'react'
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { getAiSuggestions } from '@/lib/actions'
import type { Action, TimeRange, HistoryCompaction } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { subDays, subMonths, subWeeks, subYears, isAfter, startOfDay, startOfWeek, startOfMonth, format, parseISO } from 'date-fns'

interface Goal {
  target: number
  achieved: number
}

interface URGraphSettings {
  historyCompaction: HistoryCompaction;
}

interface URGraphContextType {
  actions: Action[]
  timeRange: TimeRange
  setTimeRange: (range: TimeRange) => void
  addAction: (description: string, score: number, category?: string) => void
  deleteAction: (id: string) => void
  resetData: () => void
  getSuggestions: (score: number) => Promise<string[]>
  graphData: { date: string; value: number; dailyDelta: number }[]
  stats: {
    dailyScore: number
    dailyActions: number
    avgScore: number
    streak: number
  }
  goal: Goal
  setGoal: (goal: Goal) => void
  importData: (data: Action[]) => void;
  categories: string[];
  settings: URGraphSettings;
  setSettings: (settings: URGraphSettings) => void;
}

export const URGraphContext = createContext<URGraphContextType | null>(null)

export function URGraphProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<Action[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL')
  const [goal, setGoal] = useState<Goal>({ target: 20, achieved: 0 })
  const [settings, setSettings] = useState<URGraphSettings>({ historyCompaction: 'never' });
  const { toast } = useToast()

  useEffect(() => {
    try {
      const storedActions = localStorage.getItem('urgraph:actions')
      if (storedActions) {
        setActions(JSON.parse(storedActions))
      }
      const storedGoal = localStorage.getItem('urgraph:goal');
      if (storedGoal) {
        setGoal(JSON.parse(storedGoal));
      }
      const storedSettings = localStorage.getItem('urgraph:settings');
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error("Failed to load from localStorage", error)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('urgraph:actions', JSON.stringify(actions))
    } catch (error)
    {
      console.error("Failed to save to localStorage", error)
    }
  }, [actions])

  useEffect(() => {
    try {
        localStorage.setItem('urgraph:goal', JSON.stringify(goal));
    } catch (error) {
        console.error("Failed to save goal to localStorage", error);
    }
  }, [goal]);

  useEffect(() => {
    try {
        localStorage.setItem('urgraph:settings', JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save settings to localStorage", error);
    }
  }, [settings]);

  const compactHistory = useCallback((actionsToCompact: Action[]) => {
    if (settings.historyCompaction === 'never' || actionsToCompact.length === 0) return actionsToCompact;

    const now = new Date();
    let thresholdDate: Date;
    let periodFormat: string;
    let periodName: string;

    if (settings.historyCompaction === 'weekly') {
      thresholdDate = startOfWeek(now, { weekStartsOn: 1 });
      periodFormat = 'yyyy-ww';
      periodName = 'week';
    } else { // monthly
      thresholdDate = startOfMonth(now);
      periodFormat = 'yyyy-MM';
      periodName = 'month';
    }

    const actionsToKeep: Action[] = [];
    const compactionGroups: { [key: string]: Action[] } = {};

    actionsToCompact.forEach(action => {
      const actionDate = parseISO(action.date);
      if (isAfter(actionDate, thresholdDate) || action.description.startsWith('Compacted')) {
        actionsToKeep.push(action);
      } else {
        const periodKey = format(actionDate, periodFormat);
        if (!compactionGroups[periodKey]) {
          compactionGroups[periodKey] = [];
        }
        compactionGroups[periodKey].push(action);
      }
    });

    const compactedActions: Action[] = Object.entries(compactionGroups).map(([periodKey, group]) => {
      const compactedScore = group.reduce((sum, action) => sum + action.score, 0);
      const firstActionDate = group.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())[0].date;
      
      return {
        id: `compacted-${periodKey}`,
        description: `Compacted Score for ${periodName} of ${format(parseISO(firstActionDate), 'MMM yyyy')}`,
        score: compactedScore,
        date: firstActionDate,
        category: 'COMPACTED'
      };
    });

    // Merge new compacted actions with existing ones
    const finalCompacted = compactedActions.reduce((acc, current) => {
        const existing = acc.find(a => a.id === current.id);
        if (existing) {
            existing.score += current.score;
        } else {
            acc.push(current);
        }
        return acc;
    }, actionsToKeep.filter(a => a.id.startsWith('compacted-')));

    return [...actionsToKeep.filter(a => !a.id.startsWith('compacted-')), ...finalCompacted];
  }, [settings.historyCompaction]);

  useEffect(() => {
    if (settings.historyCompaction !== 'never') {
        const compacted = compactHistory(actions);
        if (JSON.stringify(compacted) !== JSON.stringify(actions)) {
            setActions(compacted);
        }
    }
  }, [settings.historyCompaction, compactHistory]);


  const addAction = useCallback((description: string, score: number, category?: string) => {
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Action description cannot be empty.",
        variant: "destructive",
      })
      return
    }
    const newAction: Action = {
      id: crypto.randomUUID(),
      description,
      score,
      date: new Date().toISOString(),
      category: category?.trim() || undefined
    }
    setActions(prev => [...prev, newAction])
  }, [toast])

  const deleteAction = useCallback((id: string) => {
    setActions(prev => prev.filter(action => action.id !== id))
  }, [])

  const resetData = useCallback(() => {
    setActions([])
    setGoal({ target: 20, achieved: 0 });
    toast({
      title: "Data Reset",
      description: "All your URGraph data has been cleared.",
    })
  }, [toast])

  const importData = useCallback((data: Action[]) => {
    setActions(data);
    toast({
      title: "Import Successful",
      description: "Your data has been imported.",
    });
  }, [toast]);

  const getSuggestions = useCallback(async (score: number) => {
    const previousEntries = actions
      .filter(a => !a.description.startsWith('Compacted'))
      .slice(-10)
      .map(a => a.description)
    return getAiSuggestions({ score, previousEntries })
  }, [actions])

  const categories = useMemo(() => {
    const allCategories = actions.map(a => a.category).filter(c => Boolean(c) && c !== 'COMPACTED') as string[];
    return [...new Set(allCategories)].sort();
  }, [actions]);

  const filteredActions = useMemo(() => {
    const now = new Date()
    let startDate: Date;

    switch (timeRange) {
      case '1D':
          startDate = subDays(now, 1);
          break;
      case '1W':
          startDate = subWeeks(now, 1);
          break;
      case '1M':
        startDate = subMonths(now, 1);
        break;
      case '3M':
        startDate = subMonths(now, 3);
        break;
      case '6M':
        startDate = subMonths(now, 6);
        break;
      case '1Y':
        startDate = subYears(now, 1);
        break;
      case 'ALL':
      default:
        return actions;
    }
    return actions.filter(action => isAfter(parseISO(action.date), startDate));
  }, [actions, timeRange])

  const { graphData, stats } = useMemo(() => {
    const sortedActions = [...filteredActions].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
    const dailyScores: { [key: string]: number } = {}
    
    for (const action of sortedActions) {
      const day = startOfDay(parseISO(action.date)).toISOString().split('T')[0]
      dailyScores[day] = (dailyScores[day] || 0) + action.score
    }

    const today = startOfDay(new Date()).toISOString().split('T')[0];
    const todayActions = actions.filter(a => startOfDay(parseISO(a.date)).toISOString().split('T')[0] === today);

    const graphPoints = Object.entries(dailyScores).map(([date, dailyDelta]) => {
      // The `value` for the chart is now the daily net score.
      return { date, value: dailyDelta, dailyDelta: dailyDelta };
    });

    const avgScore = filteredActions.length > 0
      ? filteredActions.reduce((sum, a) => sum + a.score, 0) / filteredActions.length
      : 0
    
    const dailyScore = todayActions.reduce((sum, a) => sum + a.score, 0);

    const scoreForGoal = actions.reduce((sum, a) => sum + a.score, 0);
    setGoal(g => ({ ...g, achieved: scoreForGoal }));

    // Streak calculation
    const allDaysScores: { [key: string]: number } = {}
    for (const action of actions) {
        const day = startOfDay(parseISO(action.date)).toISOString().split('T')[0]
        allDaysScores[day] = (allDaysScores[day] || 0) + action.score
    }

    const daysWithPositiveScore = new Set(
        Object.entries(allDaysScores)
            .filter(([, score]) => score > 0)
            .map(([date]) => date)
    );

    let currentStreak = 0;
    if (daysWithPositiveScore.size > 0) {
        let currentDate = startOfDay(new Date());
        if(daysWithPositiveScore.has(currentDate.toISOString().split('T')[0])) {
            while (daysWithPositiveScore.has(currentDate.toISOString().split('T')[0])) {
                currentStreak++;
                currentDate.setDate(currentDate.getDate() - 1);
            }
        }
    }


    const newStats = {
      dailyScore,
      dailyActions: todayActions.length,
      avgScore,
      streak: currentStreak,
    }

    return { graphData: graphPoints, stats: newStats }
  }, [filteredActions, actions])

  const value = {
    actions: filteredActions,
    timeRange,
    setTimeRange,
    addAction,
    deleteAction,
    resetData,
    getSuggestions,
    graphData,
    stats,
    goal,
    setGoal,
    importData,
    categories,
    settings,
    setSettings,
  }

  return (
    <URGraphContext.Provider value={value}>
      {children}
    </URGraphContext.Provider>
  )
}
