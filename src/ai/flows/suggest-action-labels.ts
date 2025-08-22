'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting action labels/descriptions based on score patterns and previous entries.
 *
 * - suggestActionLabels - A function that suggests action labels based on input.
 * - SuggestActionLabelsInput - The input type for the suggestActionLabels function.
 * - SuggestActionLabelsOutput - The return type for the suggestActionLabels function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { subMonths, parseISO, isAfter } from 'date-fns';

const SuggestActionLabelsInputSchema = z.object({
  score: z
    .number()
    .describe('The performance score for the action, from -4 to +4.'),
  previousEntries: z
    .array(z.object({
        description: z.string(),
        score: z.number(),
        date: z.string(),
    }))
    .describe('An array of previous action entries from the last 2 months.'),
  apiKey: z.string().optional().describe('Optional user-provided Gemini API key.'),
  activeApiKey: z.string().optional().describe("Identifier for the active key ('main', 'secondary', or custom key name)."),
});
export type SuggestActionLabelsInput = z.infer<typeof SuggestActionLabelsInputSchema>;

const SuggestActionLabelsOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of suggested action labels/descriptions.'),
});
export type SuggestActionLabelsOutput = z.infer<typeof SuggestActionLabelsOutputSchema>;

export async function suggestActionLabels(input: SuggestActionLabelsInput): Promise<SuggestActionLabelsOutput> {
  return suggestActionLabelsFlow(input);
}

const relevantEntriesHelper = (input: SuggestActionLabelsInput) => {
    const twoMonthsAgo = subMonths(new Date(), 2);
    return input.previousEntries.filter(entry => isAfter(parseISO(entry.date), twoMonthsAgo));
}

const prompt = ai.definePrompt({
  name: 'suggestActionLabelsPrompt',
  input: {schema: SuggestActionLabelsInputSchema},
  output: {schema: SuggestActionLabelsOutputSchema},
  prompt: `You are an AI assistant that suggests action labels/descriptions based on the user's recent activity and performance.

  Analyze the user's performance score for the current action and their action history from the last 2 months. Note trends in their scores and the types of actions they log.

  Based on this analysis, suggest 3 concise and relevant action labels. If the score is positive, suggest actions that build on success or are ambitious. If the score is negative, suggest actions that could help them improve or get back on track.

  Current Action Score: {{{score}}}
  
  Recent History (last 2 months):
  {{#each (relevantEntries this)}}
  - "{{this.description}}" (Score: {{this.score}}, Date: {{this.date}})
  {{/each}}
  `,
  config: {
    // This allows the flow to use the correct API key based on settings
    apiKey: '{{apiKey}}',
    // Pass the active key identifier to the genkit configuration
    activeApiKey: '{{activeApiKey}}'
  }
}, {
    helpers: { relevantEntries: relevantEntriesHelper }
});


const suggestActionLabelsFlow = ai.defineFlow(
  {
    name: 'suggestActionLabelsFlow',
    inputSchema: SuggestActionLabelsInputSchema,
    outputSchema: SuggestActionLabelsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
