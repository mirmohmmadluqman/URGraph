
"use client"

import type { ReactNode } from 'react'
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { getAiSuggestions } from '@/lib/actions'
import type { Action, TimeRange, HistoryCompaction, URGraphSettings } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { subDays, subMonths, subWeeks, subYears, isAfter, startOfDay, startOfWeek, startOfMonth, format, parseISO, eachDayOfInterval, endOfDay } from 'date-fns'
import { db } from '@/lib/firebase'
import { collection, doc, getDocs, writeBatch, query, orderBy, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

// Using a static user ID for now. In a real app, this would be the authenticated user's ID.
const USER_ID = "static_user";
const ACTIONS_CACHE_KEY = 'urgraph-actions';
const GOAL_CACHE_KEY = 'urgraph-goal';
const SETTINGS_CACHE_KEY = 'urgraph-settings';

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
  graphData: { date: string; value: number; }[]
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

  const loadFromCache = useCallback(() => {
    try {
        const cachedActions = localStorage.getItem(ACTIONS_CACHE_KEY);
        if (cachedActions) setActions(JSON.parse(cachedActions));
        
        const cachedGoal = localStorage.getItem(GOAL_CACHE_KEY);
        if (cachedGoal) setGoal(JSON.parse(cachedGoal));

        const cachedSettings = localStorage.getItem(SETTINGS_CACHE_KEY);
        if (cachedSettings) setSettings(JSON.parse(cachedSettings));
    } catch (error) {
        console.warn("Failed to load from cache", error);
    }
    setIsLoading(false);
  }, []);

  const fetchData = useCallback(async () => {
    // This function will now be called after loading from cache.
    // It will silently fail if offline, relying on the cached data.
    try {
      // Fetch Actions
      const actionsQuery = query(collection(db, `users/${USER_ID}/actions`), orderBy("date", "desc"));
      const actionsSnapshot = await getDocs(actionsQuery);
      const fetchedActions = actionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Action));
      setActions(fetchedActions);
      localStorage.setItem(ACTIONS_CACHE_KEY, JSON.stringify(fetchedActions));


      // Fetch Goal
      const goalDoc = await getDoc(doc(db, `users/${USER_ID}/config/goal`));
      if (goalDoc.exists()) {
        const fetchedGoal = goalDoc.data() as Goal;
        setGoal(fetchedGoal);
        localStorage.setItem(GOAL_CACHE_KEY, JSON.stringify(fetchedGoal));
      }

      // Fetch Settings
      const settingsDoc = await getDoc(doc(db, `users/${USER_ID}/config/settings`));
      if (settingsDoc.exists()) {
        const fetchedSettings = settingsDoc.data();
        setSettings(prev => {
            const newSettings = {...prev, ...fetchedSettings};
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(newSettings));
            return newSettings;
        });
      }
    } catch (error) {
      // Don't toast here, as it's expected to fail when offline.
      // The app will just use the cached data.
      console.warn("Failed to load from Firestore (client may be offline):", error);
    }
  }, []);
  
  useEffect(() => {
    // 1. Load data from local cache immediately on app start.
    loadFromCache();
    // 2. Then, try to fetch the latest data from Firestore.
    fetchData();
  }, [loadFromCache, fetchData]);


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
            localStorage.setItem(ACTIONS_CACHE_KEY, JSON.stringify(compacted));
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
    
    const newActions = [...actions, actionWithId].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    setActions(newActions);
    localStorage.setItem(ACTIONS_CACHE_KEY, JSON.stringify(newActions));

    try {
        await setDoc(doc(db, `users/${USER_ID}/actions`, newId), newAction);
    } catch (error) {
        console.error("Failed to save action:", error);
        toast({ title: "Sync Error", description: "Could not save action to the cloud.", variant: "destructive" });
        // Revert optimistic update
        const revertedActions = actions.filter(a => a.id !== newId);
        setActions(revertedActions);
        localStorage.setItem(ACTIONS_CACHE_KEY, JSON.stringify(revertedActions));
    }
  }, [toast, actions])

  const deleteAction = useCallback(async (id: string) => {
    const originalActions = actions;
    const newActions = originalActions.filter(action => action.id !== id);
    setActions(newActions);
    localStorage.setItem(ACTIONS_CACHE_KEY, JSON.stringify(newActions));

    try {
        await deleteDoc(doc(db, `users/${USER_ID}/actions`, id));
    } catch (error) {
        console.error("Failed to delete action:", error);
        toast({ title: "Sync Error", description: "Could not delete action from the cloud.", variant: "destructive" });
        setActions(originalActions);
        localStorage.setItem(ACTIONS_CACHE_KEY, JSON.stringify(originalActions));
    }
  }, [actions, toast])

  const resetData = useCallback(async () => {
    const originalActions = actions;
    const originalGoal = goal;
    setActions([]);
    setGoal({ target: 20, achieved: 0 });
    localStorage.removeItem(ACTIONS_CACHE_KEY);
    localStorage.removeItem(GOAL_CACHE_KEY);

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
        localStorage.setItem(ACTIONS_CACHE_KEY, JSON.stringify(originalActions));
        localStorage.setItem(GOAL_CACHE_KEY, JSON.stringify(originalGoal));
    }
  }, [toast, actions, goal])

  const importData = useCallback(async (data: Action[]) => {
    const originalActions = actions;
    const newActions = [...data].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    setActions(newActions);
    localStorage.setItem(ACTIONS_CACHE_KEY, JSON.stringify(newActions));
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
        localStorage.setItem(ACTIONS_CACHE_KEY, JSON.stringify(originalActions));
    }
  }, [toast, actions]);

  const updateGoal = useCallback(async (newGoal: Goal) => {
      const originalGoal = goal;
      setGoal(newGoal);
      localStorage.setItem(GOAL_CACHE_KEY, JSON.stringify(newGoal));
      try {
        await setDoc(doc(db, `users/${USER_ID}/config/goal`), newGoal);
      } catch (error) {
        console.error("Failed to save goal:", error);
        toast({ title: "Sync Error", description: "Could not save goal to the cloud.", variant: "destructive" });
        setGoal(originalGoal);
        localStorage.setItem(GOAL_CACHE_KEY, JSON.stringify(originalGoal));
      }
  }, [goal, toast]);

  const updateSettings = useCallback(async (newSettings: URGraphSettings) => {
    const originalSettings = settings;
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(newSettings));
    try {
      await setDoc(doc(db, `users/${USER_ID}/config/settings`), newSettings, { merge: true });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({ title: "Sync Error", description: "Could not save settings to the cloud.", variant: "destructive" });
      setSettings(originalSettings);
      localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(originalSettings));
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

  const getStartDate = (range: TimeRange, earliestDate: Date | null): Date => {
      const now = new Date();
      switch (range) {
        case '1D': return subDays(now, 1);
        case '1W': return subWeeks(now, 1);
        case '1M': return subMonths(now, 1);
        case '3M': return subMonths(now, 3);
        case '6M': return subMonths(now, 6);
        case '1Y': return subYears(now, 1);
        case 'ALL':
        default: return earliestDate || subYears(now, 10);
      }
  };

  const { graphData, stats } = useMemo(() => {
    const allActionsSorted = [...actions].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
    if (allActionsSorted.length === 0) {
        return { 
            graphData: [], 
            stats: { dailyScore: 0, dailyActions: 0, avgScore: 0, streak: 0 } 
        };
    }
    
    const earliestActionDate = parseISO(allActionsSorted[0].date);
    const viewStartDate = getStartDate(timeRange, earliestActionDate);

    // Group actions by day and sum scores
    const dailyScores: { [key: string]: number } = {}
    for (const action of allActionsSorted) {
      const day = format(startOfDay(parseISO(action.date)), 'yyyy-MM-dd')
      dailyScores[day] = (dailyScores[day] || 0) + action.score
    }
    
    // Create a continuous timeline from the first action to today
    const firstDate = earliestActionDate;
    const allDays = eachDayOfInterval({ start: firstDate, end: endOfDay(new Date()) });

    // Calculate cumulative scores
    let cumulativeScore = 0;
    const cumulativePoints = allDays.map(date => {
        const dayKey = format(date, 'yyyy-MM-dd');
        const dailyChange = dailyScores[dayKey] || 0;
        cumulativeScore += dailyChange;
        return {
            date: format(date, 'yyyy-MM-dd'),
            value: cumulativeScore,
        };
    });

    // Filter points for the selected time range
    const filteredGraphPoints = cumulativePoints.filter(point => 
        isAfter(parseISO(point.date), startOfDay(viewStartDate))
    );

    // Final data for the chart
    const finalGraphData = filteredGraphPoints.map(p => ({ ...p, date: format(parseISO(p.date), 'MMM d') }));


    // Calculate stats
    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const todayActions = actions.filter(a => format(startOfDay(parseISO(a.date)), 'yyyy-MM-dd') === today);

    const filteredActionsForStats = actions.filter(action => isAfter(parseISO(action.date), viewStartDate));
    const avgScore = filteredActionsForStats.length > 0
      ? filteredActionsForStats.reduce((sum, a) => sum + a.score, 0) / filteredActionsForStats.length
      : 0
    
    const dailyScore = todayActions.reduce((sum, a) => sum + a.score, 0);

    const scoreForGoal = actions.reduce((sum, a) => sum + a.score, 0);
    // This is a side effect in a memo, which is not ideal. But for now it works.
    if (goal.achieved !== scoreForGoal) {
        setGoal(g => ({ ...g, achieved: scoreForGoal }));
    }

    // Streak calculation
    const allDaysScoresForStreak: { [key: string]: number } = {}
    for (const action of actions) {
        const day = format(startOfDay(parseISO(action.date)), 'yyyy-MM-dd')
        allDaysScoresForStreak[day] = (allDaysScoresForStreak[day] || 0) + action.score
    }

    const daysWithPositiveScore = new Set(
        Object.entries(allDaysScoresForStreak)
            .filter(([, score]) => score > 0)
            .map(([date]) => date)
    );

    let currentStreak = 0;
    if (daysWithPositiveScore.size > 0) {
        let currentDate = startOfDay(new Date());
        if(!daysWithPositiveScore.has(format(currentDate, 'yyyy-MM-dd'))) {
          currentDate.setDate(currentDate.getDate() -1);
        }
        
        while (daysWithPositiveScore.has(format(currentDate, 'yyyy-MM-dd'))) {
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

    return { graphData: finalGraphData, stats: newStats }
  }, [actions, timeRange, goal.achieved])

  const value = {
    actions,
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
