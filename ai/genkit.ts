import {genkit, GenerationCommonConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { z } from 'zod';

// Helper to get the API key based on flow configuration
function getApiKey(config: GenerationCommonConfig<z.ZodType>) {
    const state = config as any;

    if (state.apiKey) {
      // This is a user-provided key from the settings UI
      return state.apiKey;
    }
    
    // Check for Main or Secondary keys from .env
    const activeSystemKey = state.activeApiKey; // 'main', 'secondary', 'tertiary'
    if (activeSystemKey === 'secondary') {
        return process.env.SECONDARY_GEMINI_API_KEY;
    }
    if (activeSystemKey === 'tertiary') {
        return process.env.TERTIARY_GEMINI_API_KEY;
    }
    
    // Fallback to the main key if no specific key is designated
    return process.env.MAIN_GEMINI_API_KEY;
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: getApiKey,
    })
  ],
  model: 'googleai/gemini-2.0-flash',
});
