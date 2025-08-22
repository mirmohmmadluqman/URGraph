import {genkit, GenerationCommonConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { z } from 'zod';

// Helper to get the API key from environment or flow state
function getApiKey(config: GenerationCommonConfig<z.ZodType>) {
    const state = config as any;
    return state.apiKey || process.env.GEMINI_API_KEY;
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: getApiKey,
    })
  ],
  model: 'googleai/gemini-2.0-flash',
});
