"use client"

import React, { useRef } from 'react';
import { Download, Upload, Trash2, FileJson, FileText, Image as ImageIcon, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ThemeToggle } from '@/components/theme-toggle'
import { useURGraph } from '@/hooks/use-urgraph'
import { useToast } from '@/hooks/use-toast';
import type { Action } from '@/lib/types';
import { SettingsDialog } from './settings-dialog';
import { URGraphLogo } from './urgraph-logo';


export function URGraphHeader() {
  const { resetData, actions, importData } = useURGraph();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = (format: 'json' | 'csv' | 'png' | 'svg') => {
    if (format === 'json') {
      const dataStr = JSON.stringify(actions, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'urgraph_data.json';
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      if (actions.length === 0) return;
      const headers = Object.keys(actions[0]);
      const csvContent = [
        headers.join(','),
        ...actions.map(row => headers.map(header => JSON.stringify(row[header as keyof Action])).join(','))
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'urgraph_data.csv';
      link.click();
      URL.revokeObjectURL(url);
    } else {
        const svg = document.querySelector('#urgraph-chart-svg');
        if (!svg) {
            toast({ title: "Error", description: "Chart not found.", variant: 'destructive'});
            return;
        }

        const svgData = new XMLSerializer().serializeToString(svg);
        if (format === 'svg') {
            const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'urgraph.svg';
            link.click();
            URL.revokeObjectURL(url);
        } else if (format === 'png') {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const pngUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = pngUrl;
                link.download = 'urgraph.png';
                link.click();
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          // Basic validation
          if (Array.isArray(data) && data.every(item => 'id' in item && 'description' in item && 'score' in item && 'date' in item)) {
            importData(data);
          } else {
            throw new Error('Invalid file format');
          }
        } catch (error) {
          toast({
            title: "Import Failed",
            description: "The selected file is not valid JSON or has an incorrect format.",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10 backdrop-blur-sm bg-white/30 dark:bg-black/30 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <URGraphLogo className="w-8 h-8 text-primary"/>
        <h1 className="text-2xl font-bold tracking-tighter">URGraph</h1>
      </div>
      <div className="flex items-center gap-2">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" /> Import
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('json')}><FileJson className="mr-2 h-4 w-4"/>Export as JSON</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('csv')}><FileText className="mr-2 h-4 w-4"/>Export as CSV</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport('png')}><ImageIcon className="mr-2 h-4 w-4"/>Save as PNG</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('svg')}><ImageIcon className="mr-2 h-4 w-4"/>Save as SVG</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <SettingsDialog />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive-outline" size="sm">
                <Trash2 className="mr-2 h-4 w-4" /> Reset Data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all your actions and reset your goals.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetData}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ThemeToggle />
      </div>
    </header>
  )
}
