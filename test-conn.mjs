import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

async function testAll() {
  console.log('--- Testing Connections ---');
  
  // 1. Test Resend
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const domains = await resend.domains.list();
    if (domains.error) throw new Error(domains.error.message);
    console.log('✅ Resend: Connected successfully!');
  } catch (e) {
    console.log('❌ Resend: Connection failed -', e.message);
  }

  // 2. Test Gemini API Generation
  try {
    console.log('Testing Gemini Generation API with gemini-2.0-flash...');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Say 'Hello, API works!'");
    if (result.response.text()) {
        console.log('✅ Gemini API Generation: Success!');
        console.log('Response:', result.response.text());
    }
  } catch (e) {
    console.log('❌ Gemini API Generation: Connection failed -', e.message);
  }

  // 3. Test Firebase
  try {
    const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    // Test a read operation to check rules/connection
    const q = query(collection(db, "test_connection_ping"), limit(1));
    try {
        await getDocs(q);
        console.log('✅ Firebase: Connected successfully!');
    } catch(err) {
        if (err.message.includes('Missing or insufficient permissions')) {
            console.log('✅ Firebase: Connected successfully! (Note: Database rules deny read access, which is normal for an empty or strictly secured database).');
        } else {
            throw err;
        }
    }
  } catch (e) {
    console.log('❌ Firebase: Connection failed -', e.message);
  }
}

testAll().then(() => process.exit(0)).catch(() => process.exit(1));
