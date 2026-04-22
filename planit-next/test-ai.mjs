import { GoogleGenerativeAI } from '@google/generative-ai';

async function run() {
  try {
    const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "NONE";
    console.log("Using Key ending in:", key.slice(-4));
    const genAI = new GoogleGenerativeAI(key);
    
    console.log("Testing gemini-2.5-flash...");
    try {
      const model25 = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model25.generateContent("Hello!");
      console.log(result.response.text());
    } catch(e) {
      console.error("2.5 Error:", e.message);
    }
    
    console.log("Testing gemini-1.5-flash...");
    const model15 = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result15 = await model15.generateContent("Hello!");
    console.log("1.5 Success:", result15.response.text());
  } catch (error) {
    console.error("Overall AI Error:", error);
  }
}
run();
