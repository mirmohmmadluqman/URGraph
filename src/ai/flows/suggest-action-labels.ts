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

const SuggestActionLabelsInputSchema = z.object({
  score: z
    .number()
    .describe('The performance score for the action, from -4 to +4.'),
  previousEntries: z
    .array(z.string())
    .describe('An array of previous action descriptions.'),
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

const prompt = ai.definePrompt({
  name: 'suggestActionLabelsPrompt',
  input: {schema: SuggestActionLabelsInputSchema},
  output: {schema: SuggestActionLabelsOutputSchema},
  prompt: `You are an AI assistant that suggests action labels/descriptions based on the user's input.

  The user has provided a score for the action, and a list of previous action descriptions.

  Based on this information, suggest 3 action labels/descriptions that the user could use.

  Score: {{{score}}}
  Previous Entries:
  {{#each previousEntries}}
  - {{{this}}}
  {{/each}}
  `,
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
