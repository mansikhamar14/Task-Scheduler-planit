require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  try {
    const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    console.log("Using Key ending in:", key ? key.slice(-4) : "NONE");
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent("Hello!");
    console.log(result.response.text());
  } catch (error) {
    console.error("AI Error:", error);
  }
}
run();
