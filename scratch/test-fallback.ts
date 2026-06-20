import { generateWithFallback } from '../src/lib/ai';

async function run() {
  try {
    console.log("Testing generation with fallback...");
    // Force gemini to fail by using a fake key in the wrapper? No, we can't easily inject a fake key here without changing process.env.
    // Instead, I'll just change process.env.GEMINI_API_KEY to 'invalid' for this script.
    process.env.GEMINI_API_KEY = 'invalid_key_to_force_fallback';
    
    const prompt = `Write a cold email to John Doe at Acme Corp offering our software.
Return ONLY a valid JSON object with 'subject' and 'body' properties. Do not wrap in markdown blocks or include any other text.`;
    
    console.log("Prompt:", prompt);
    const result = await generateWithFallback(prompt, true);
    console.log("\nSuccess!");
    console.log("Result:", result);
  } catch (error) {
    console.error("\nFailed!");
    console.error(error);
  }
}

run();
