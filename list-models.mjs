import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

async function listModels() {
  console.log('Testing Gemini API key...');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await res.json();
  if (data.error) {
     console.log('❌ Gemini API Error:', data.error.message);
  } else {
     const modelNames = data.models.map(m => m.name.replace('models/', ''));
     console.log('✅ Gemini API: Connected successfully!');
     console.log('Available models:\n  - ' + modelNames.join('\n  - '));
  }
}

listModels();
