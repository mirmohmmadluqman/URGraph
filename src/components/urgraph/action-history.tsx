"use client"

import React, { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Trash2, Search, ArrowUp, ArrowDown } from 'lucide-react'
import { useURGraph } from '@/hooks/use-urgraph'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"

export function ActionHistory() {
  const { actions: allActions, deleteAction, categories } = useURGraph()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'score' | 'category'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const filteredAndSortedActions = useMemo(() => allActions
    .filter(action => {
        const searchMatch = action.description.toLowerCase().includes(searchTerm.toLowerCase());
        const categoryMatch = categoryFilter === 'ALL' || 
                              (categoryFilter === 'UNCATEGORIZED' && !action.category) ||
                              action.category === categoryFilter;
        return searchMatch && categoryMatch;
    })
    .sort((a, b) => {
        if (sortConfig.key === 'date') {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        } else if (sortConfig.key === 'score') {
            return sortConfig.direction === 'asc' ? a.score - b.score : b.score - a.score;
        } else if (sortConfig.key === 'category') {
            const catA = a.category || '';
            const catB = b.category || '';
            if (catA < catB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (catA > catB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        }
        return 0;
    }), [allActions, searchTerm, categoryFilter, sortConfig]);

  const handleSort = (key: 'date' | 'score' | 'category') => {
    setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  }

  const SortIcon = ({ columnKey }: { columnKey: 'date' | 'score' | 'category'}) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 inline ml-1" /> : <ArrowDown className="h-4 w-4 inline ml-1" />;
  }

  return (
    <Card className="bg-card/50 backdrop-blur-lg">
      <CardHeader>
        <CardTitle>Action History</CardTitle>
        <CardDescription>A log of your recent actions. Click headers to sort.</CardDescription>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search actions..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                    <SelectItem value="UNCATEGORIZED">Uncategorized</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg max-h-[400px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('category')}>Category <SortIcon columnKey="category" /></TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>Date <SortIcon columnKey="date" /></TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort('score')}>Score <SortIcon columnKey="score" /></TableHead>
              <TableHead className="text-right">Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedActions.length > 0 ? (
                filteredAndSortedActions.map(action => (
                    <TableRow key={action.id}>
                    <TableCell className="font-medium">{action.description}</TableCell>
                    <TableCell className="text-muted-foreground">{action.category || '—'}</TableCell>
                    <TableCell>{format(parseISO(action.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                        <Badge variant={action.score > 0 ? 'default' : action.score < 0 ? 'destructive' : 'secondary'} className={`${action.score > 0 ? 'bg-positive hover:bg-positive/90 text-primary-foreground' : action.score < 0 ? 'bg-negative hover:bg-negative/90 text-destructive-foreground' : ''}`}>
                        {action.score > 0 ? `+${action.score}` : action.score}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Delete Action?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the action: "{action.description}". This cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteAction(action.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                    </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No actions found.</TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  )
}

    