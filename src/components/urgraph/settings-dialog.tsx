"use client"

import React, { useState } from 'react'
import { Settings, PlusCircle, Trash2 } from 'lucide-react'
import { useURGraph } from '@/hooks/use-urgraph'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import type { HistoryCompaction } from '@/lib/types'
import { Separator } from '../ui/separator'
import { Input } from '../ui/input'
import { useToast } from '@/hooks/use-toast'

export function SettingsDialog() {
  const { settings, setSettings } = useURGraph()
  const { toast } = useToast();
  const [newApiKey, setNewApiKey] = useState({ name: '', key: '' });

  const handleCompactionChange = (value: string) => {
    setSettings({ ...settings, historyCompaction: value as HistoryCompaction });
  }

  const handleActiveApiKeyChange = (value: string) => {
    setSettings({ ...settings, activeApiKey: value });
  }

  const handleAddApiKey = () => {
    if (!newApiKey.name.trim() || !newApiKey.key.trim()) {
        toast({ title: "Error", description: "API Key Name and Value cannot be empty.", variant: "destructive" });
        return;
    }
    const updatedApiKeys = [...(settings.apiKeys || []), newApiKey];
    setSettings({ ...settings, apiKeys: updatedApiKeys });
    setNewApiKey({ name: '', key: '' });
    toast({ title: "Success", description: "API Key added."});
  }

  const handleRemoveApiKey = (keyNameToRemove: string) => {
    const updatedApiKeys = (settings.apiKeys || []).filter(k => k.name !== keyNameToRemove);
    const newSettings = { ...settings, apiKeys: updatedApiKeys };
    // If the active key was the one removed, default to the main one
    if (settings.activeApiKey === keyNameToRemove) {
        newSettings.activeApiKey = 'main';
    }
    setSettings(newSettings);
    toast({ title: "Success", description: "API Key removed."});
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your application settings.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>History Compaction</Label>
                    <p className="text-sm text-muted-foreground">
                        Automatically summarize old action entries to save space. 
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
            
            <Separator />

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>AI Suggestions Provider (Gemini)</Label>
                    <p className="text-sm text-muted-foreground">
                        Use the default API key or add your own.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label>Active API Key</Label>
                    <RadioGroup
                        value={settings.activeApiKey || 'main'}
                        onValueChange={handleActiveApiKeyChange}
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="main" id="main-key" />
                            <Label htmlFor="main-key">Default Key</Label>
                        </div>
                        {(settings.apiKeys || []).map(apiKey => (
                             <div className="flex items-center space-x-2" key={apiKey.name}>
                                <RadioGroupItem value={apiKey.name} id={`key-${apiKey.name}`} />
                                <Label htmlFor={`key-${apiKey.name}`}>{apiKey.name}</Label>
                             </div>
                        ))}
                    </RadioGroup>
                </div>

                <div className="space-y-2">
                    <Label>Manage Your API Keys</Label>
                    <div className="space-y-2">
                        {(settings.apiKeys || []).map(apiKey => (
                            <div key={apiKey.name} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                               <p className="text-sm font-medium flex-1">{apiKey.name}</p>
                               <p className="text-sm text-muted-foreground truncate flex-[2]">Key: ••••••••{apiKey.key.slice(-4)}</p>
                               <Button variant="ghost" size="icon" onClick={() => handleRemoveApiKey(apiKey.name)}>
                                   <Trash2 className="w-4 h-4 text-destructive" />
                               </Button>
                            </div>
                        ))}
                    </div>
                </div>

                 <div className="space-y-2 pt-4">
                    <Label>Add New Gemini API Key</Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            placeholder="Key Name (e.g., My Personal Key)" 
                            value={newApiKey.name} 
                            onChange={(e) => setNewApiKey({...newApiKey, name: e.target.value})}
                            className="bg-background" />
                        <Input 
                            placeholder="API Key Value" 
                            type="password"
                            value={newApiKey.key} 
                            onChange={(e) => setNewApiKey({...newApiKey, key: e.target.value})}
                            className="bg-background" />
                        <Button onClick={handleAddApiKey} size="icon"><PlusCircle className="h-4 w-4"/></Button>
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
