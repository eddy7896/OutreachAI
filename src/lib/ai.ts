import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// Initialize primary client (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Initialize secondary client (Fallback OpenAI-compatible: Groq, Ollama, OpenRouter)
let openaiClient: OpenAI | null = null;
const fallbackApiKey = process.env.FALLBACK_API_KEY;
const fallbackApiUrl = process.env.FALLBACK_API_URL;
const fallbackModel = process.env.FALLBACK_MODEL || 'meta-llama/llama-3-8b-instruct:free';

if (fallbackApiKey && fallbackApiUrl) {
  openaiClient = new OpenAI({
    apiKey: fallbackApiKey,
    baseURL: fallbackApiUrl,
  });
} else if (fallbackApiUrl?.includes('localhost')) {
  // Local ollama doesn't require API key
  openaiClient = new OpenAI({
    apiKey: 'ollama',
    baseURL: fallbackApiUrl,
  });
}

/**
 * Attempts to generate content using Gemini. If it fails, falls back to the configured OpenAI-compatible API.
 * @param prompt The complete prompt string.
 * @param isJSON Whether the response should be parsed as JSON.
 * @returns The parsed JSON object or raw string depending on `isJSON` flag.
 */
export async function generateWithFallback(prompt: string, isJSON: boolean = false): Promise<any> {
  let geminiError: any = null;

  // 1. Try Primary: Gemini
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    if (isJSON) {
      const match = responseText.match(/\{[\s\S]*\}/);
      const cleanedText = match ? match[0] : responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      try {
        return JSON.parse(cleanedText);
      } catch (e: any) {
        throw new Error(`Gemini failed to return valid JSON. Raw output: ${responseText}`);
      }
    }
    return responseText;
  } catch (error: any) {
    console.warn(`[AI WARN] Gemini Primary Failed: ${error.message}. Attempting Fallback...`);
    geminiError = error;
  }

  // 2. Try Secondary Fallbacks (Waterfall)
  if (!openaiClient) {
    throw new Error(`Primary Gemini failed, and no FALLBACK_API_URL / FALLBACK_API_KEY is configured. Gemini Error: ${geminiError?.message}`);
  }

  const modelsToTry = [
    'mistralai/mistral-7b-instruct:free',
    'meta-llama/llama-3-8b-instruct:free',
    'google/gemma-7b-it:free',
    'huggingfaceh4/zephyr-7b-beta:free',
    'openrouter/free'
  ];

  let lastFallbackError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const completion = await openaiClient.chat.completions.create({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = completion.choices[0]?.message?.content || '';

      if (isJSON) {
        const match = responseText.match(/\{[\s\S]*\}/);
        const cleanedText = match ? match[0] : responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
          return JSON.parse(cleanedText);
        } catch (e: any) {
          throw new Error(`Fallback model ${modelName} failed to return valid JSON. Raw output: ${responseText}`);
        }
      }

      return responseText; // Successfully generated and parsed/validated
    } catch (fallbackError: any) {
      console.warn(`[AI WARN] Fallback ${modelName} failed: ${fallbackError.message}. Trying next...`);
      lastFallbackError = fallbackError;
      // Loop continues to the next model
    }
  }

  console.error(`[AI ERROR] Both Gemini and all Fallback models failed!`);
  console.error(`Gemini Error:`, geminiError);
  console.error(`Last Fallback Error:`, lastFallbackError);
  throw new Error(`AI Generation failed on all providers. Last secondary error: ${lastFallbackError?.message}`);
}
