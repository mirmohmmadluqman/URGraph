'use server';

import { suggestActionLabels } from '@/ai/flows/suggest-action-labels';
import type { SuggestActionLabelsInput } from '@/ai/flows/suggest-action-labels';

export async function getAiSuggestions(
  input: SuggestActionLabelsInput
): Promise<string[]> {
  try {
    const result = await suggestActionLabels(input);
    return result.suggestions;
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    return [];
  }
}
