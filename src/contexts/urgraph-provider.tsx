
"use client"

import type { ReactNode } from 'react'
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { getAiSuggestions } from '@/lib/actions'
import type { Action, TimeRange, HistoryCompaction, URGraphSettings } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { subDays, subMonths, subWeeks, subYears, isAfter, startOfDay, startOfWeek, startOfMonth, format, parseISO } from 'date-fns'
import { db } from '@/lib/firebase'
import { collection, doc, getDocs, writeBatch, query, orderBy, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

// Using a static user ID for now. In a real app, this would be the authenticated user's ID.
const USER_ID = "static_user";

interface Goal {
  target: number
  achieved: number
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
  const [settings, setSettings] = useState<URGraphSettings>({ historyCompaction: 'never', activeApiKey: 'main', apiKeys: [] });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch Actions
      const actionsQuery = query(collection(db, `users/${USER_ID}/actions`), orderBy("date", "desc"));
      const actionsSnapshot = await getDocs(actionsQuery);
      const fetchedActions = actionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Action));
      setActions(fetchedActions);

      // Fetch Goal
      const goalDoc = await getDoc(doc(db, `users/${USER_ID}/config/goal`));
      if (goalDoc.exists()) {
        setGoal(goalDoc.data() as Goal);
      }

      // Fetch Settings
      const settingsDoc = await getDoc(doc(db, `users/${USER_ID}/config/settings`));
      if (settingsDoc.exists()) {
        setSettings(prev => ({...prev, ...settingsDoc.data()}));
      }
    } catch (error) {
      console.error("Failed to load from Firestore", error);
      toast({ title: "Error", description: "Could not load your data from the cloud.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const compactHistory = useCallback((actionsToCompact: Action[]) => {
    if (settings.historyCompaction === 'never' || actionsToCompact.length === 0) return { compacted: actionsToCompact, toDelete: [] };

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
    const actionsToDelete: string[] = [];
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
        actionsToDelete.push(action.id);
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
    
    return { compacted: [...actionsToKeep, ...compactedActions], toDelete: actionsToDelete };
  }, [settings.historyCompaction]);

  useEffect(() => {
    async function runCompaction() {
        if (isLoading || settings.historyCompaction === 'never') return;

        const { compacted, toDelete } = compactHistory(actions);
        if (toDelete.length > 0) {
            console.log(`Compacting ${toDelete.length} actions.`);
            setActions(compacted);
            try {
                const batch = writeBatch(db);
                toDelete.forEach(id => {
                    batch.delete(doc(db, `users/${USER_ID}/actions`, id));
                });
                compacted.filter(a => a.id.startsWith('compacted-')).forEach(action => {
                    const { id, ...actionData } = action;
                    batch.set(doc(db, `users/${USER_ID}/actions`, id), actionData);
                });
                await batch.commit();
                toast({ title: "History Compacted", description: `Summarized ${toDelete.length} old actions.`});
            } catch (error) {
                console.error("Error compacting history:", error);
                toast({ title: "Error", description: "Could not compact action history.", variant: "destructive" });
                fetchData(); // Refetch to revert state
            }
        }
    }
    runCompaction();
}, [settings.historyCompaction, compactHistory, actions, toast, fetchData, isLoading]);


  const addAction = useCallback(async (description: string, score: number, category?: string) => {
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Action description cannot be empty.",
        variant: "destructive",
      })
      return
    }
    const newAction: Omit<Action, 'id'> = {
      description,
      score,
      date: new Date().toISOString(),
      category: category?.trim() || undefined
    }
    const newId = crypto.randomUUID();
    const actionWithId = { ...newAction, id: newId };
    setActions(prev => [...prev, actionWithId].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));

    try {
        await setDoc(doc(db, `users/${USER_ID}/actions`, newId), newAction);
    } catch (error) {
        console.error("Failed to save action:", error);
        toast({ title: "Sync Error", description: "Could not save action to the cloud.", variant: "destructive" });
        setActions(prev => prev.filter(a => a.id !== newId)); // Revert optimistic update
    }
  }, [toast])

  const deleteAction = useCallback(async (id: string) => {
    const originalActions = actions;
    setActions(prev => prev.filter(action => action.id !== id))
    try {
        await deleteDoc(doc(db, `users/${USER_ID}/actions`, id));
    } catch (error) {
        console.error("Failed to delete action:", error);
        toast({ title: "Sync Error", description: "Could not delete action from the cloud.", variant: "destructive" });
        setActions(originalActions);
    }
  }, [actions, toast])

  const resetData = useCallback(async () => {
    const originalActions = actions;
    const originalGoal = goal;
    setActions([]);
    setGoal({ target: 20, achieved: 0 });
    try {
      const actionsSnapshot = await getDocs(collection(db, `users/${USER_ID}/actions`));
      const batch = writeBatch(db);
      actionsSnapshot.docs.forEach(d => batch.delete(d.ref));
      batch.set(doc(db, `users/${USER_ID}/config/goal`), { target: 20, achieved: 0 });
      await batch.commit();
      toast({
        title: "Data Reset",
        description: "All your URGraph data has been cleared from the cloud.",
      })
    } catch (error) {
        console.error("Failed to reset data:", error);
        toast({ title: "Sync Error", description: "Could not reset data in the cloud.", variant: "destructive" });
        setActions(originalActions);
        setGoal(originalGoal);
    }
  }, [toast, actions, goal])

  const importData = useCallback(async (data: Action[]) => {
    const originalActions = actions;
    setActions(data);
    try {
        const batch = writeBatch(db);
        // Clear existing actions first
        const actionsSnapshot = await getDocs(collection(db, `users/${USER_ID}/actions`));
        actionsSnapshot.docs.forEach(d => batch.delete(d.ref));
        // Add new actions
        data.forEach(action => {
            const { id, ...actionData } = action;
            batch.set(doc(db, `users/${USER_ID}/actions`, id), actionData);
        });
        await batch.commit();
        toast({
          title: "Import Successful",
          description: "Your data has been imported and saved to the cloud.",
        });
    } catch (error) {
        console.error("Failed to import data:", error);
        toast({ title: "Sync Error", description: "Could not save imported data to the cloud.", variant: "destructive" });
        setActions(originalActions);
    }
  }, [toast, actions]);

  const updateGoal = useCallback(async (newGoal: Goal) => {
      const originalGoal = goal;
      setGoal(newGoal);
      try {
        await setDoc(doc(db, `users/${USER_ID}/config/goal`), newGoal);
      } catch (error) {
        console.error("Failed to save goal:", error);
        toast({ title: "Sync Error", description: "Could not save goal to the cloud.", variant: "destructive" });
        setGoal(originalGoal);
      }
  }, [goal, toast]);

  const updateSettings = useCallback(async (newSettings: URGraphSettings) => {
    const originalSettings = settings;
    setSettings(newSettings);
    try {
      await setDoc(doc(db, `users/${USER_ID}/config/settings`), newSettings, { merge: true });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({ title: "Sync Error", description: "Could not save settings to the cloud.", variant: "destructive" });
      setSettings(originalSettings);
    }
}, [settings, toast]);


  const getSuggestions = useCallback(async (score: number) => {
    const twoMonthsAgo = subMonths(new Date(), 2);
    const previousEntries = actions
      .filter(a => !a.description.startsWith('Compacted') && isAfter(parseISO(a.date), twoMonthsAgo))
      .map(a => ({ description: a.description, score: a.score, date: a.date }));
    
    // Find the active user-provided API key if it's not main or secondary
    const activeUserKey = settings.apiKeys?.find(k => k.name === settings.activeApiKey);

    return getAiSuggestions({ 
      score, 
      previousEntries, 
      apiKey: activeUserKey?.key,
      activeApiKey: settings.activeApiKey || 'main',
    })
  }, [actions, settings.activeApiKey, settings.apiKeys])

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
        if(!daysWithPositiveScore.has(currentDate.toISOString().split('T')[0])) {
          currentDate.setDate(currentDate.getDate() -1);
        }
        
        while (daysWithPositiveScore.has(currentDate.toISOString().split('T')[0])) {
            currentStreak++;
            currentDate.setDate(currentDate.getDate() - 1);
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
    setGoal: updateGoal,
    importData,
    categories,
    settings,
    setSettings: updateSettings,
  }

  return (
    <URGraphContext.Provider value={value}>
      {children}
    </URGraphContext.Provider>
  )
}
