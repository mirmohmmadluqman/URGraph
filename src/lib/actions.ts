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
    // Check for specific API key error and provide a helpful message
    if (error instanceof Error && error.message.includes('API key not valid')) {
      return ['Error: The provided API key is invalid. Please check your settings.'];
    }
    return [];
  }
}
