"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, PlusCircle } from 'lucide-react'
import { useLifeGraph } from '@/hooks/use-lifegraph'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '../ui/skeleton'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export function ActionLogger() {
  const [description, setDescription] = useState('')
  const [score, setScore] = useState(0)
  const [category, setCategory] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const { addAction, getSuggestions, categories } = useLifeGraph()

  const handleGetSuggestions = async (currentScore: number) => {
    setIsLoadingSuggestions(true)
    setSuggestions([])
    const result = await getSuggestions(currentScore)
    setSuggestions(result)
    setIsLoadingSuggestions(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addAction(description, score, category)
    setDescription('')
    setScore(0)
    setCategory('')
    setSuggestions([])
  }

  return (
    <Card className="bg-card/50 backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusCircle className="text-primary" />
          Log New Action
        </CardTitle>
        <CardDescription>Add a new entry to your LifeGraph.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="action-description">Action</Label>
            <Textarea
              id="action-description"
              placeholder="What did you accomplish?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="action-category">Category (Optional)</Label>
            <Input
              id="action-category"
              placeholder="e.g. Work, Health, Study"
              value={category}
              onChange={e => setCategory(e.target.value)}
              list="category-suggestions"
              className="bg-background"
            />
            <datalist id="category-suggestions">
                {categories.map(cat => <option key={cat} value={cat} />)}
            </datalist>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Performance Score</Label>
              <motion.div
                key={score}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="font-bold text-2xl"
                style={{ color: `hsl(var(--${score > 0 ? 'positive' : score < 0 ? 'negative' : 'muted-foreground'}))` }}
              >
                {score > 0 ? `+${score}` : score}
              </motion.div>
            </div>
            <Slider
              value={[score]}
              onValueChange={([val]) => setScore(val)}
              onValueCommit={([val]) => handleGetSuggestions(val)}
              min={-4}
              max={4}
              step={1}
            />
          </div>

          <div className="space-y-3 min-h-[6rem]">
            <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Bot size={16} /> AI Suggestions
            </h4>
            <div className="flex flex-wrap gap-2">
              {isLoadingSuggestions ? (
                <>
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-32 rounded-full" />
                    <Skeleton className="h-6 w-28 rounded-full" />
                </>
              ) : (
                suggestions.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                      onClick={() => setDescription(s)}
                    >
                      {s}
                    </Badge>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={!description.trim()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Log Action
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
