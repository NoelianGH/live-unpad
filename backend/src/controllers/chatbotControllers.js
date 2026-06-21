import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Setup Data Path
const dataPath = path.join(process.cwd(), 'DataLiveUnpad.txt');
let knowledgeBase = '';

try {
  knowledgeBase = fs.readFileSync(dataPath, 'utf8');
} catch (err) {
  console.error('Error reading data file:', err);
  knowledgeBase = "Informasi tentang LiVE Unpad sedang tidak tersedia.";
}

// 2. Initialize Gemini (ONLY ONE DECLARATION FOR 'model')
const googleApiKey = process.env.GOOGLE_API_KEY; 

if (!googleApiKey) {
  throw new Error('Missing GOOGLE_API_KEY in .env file.');
}

const genAI = new GoogleGenerativeAI(googleApiKey);

// This is the ONLY 'const model' declaration you need
const model = genAI.getGenerativeModel(
  {model: "gemini-1.5-pro" },
  { apiVersion: "v1" } // Tambahkan baris ini untuk memaksa versi stabil
);

// 3. Store sessions in memory
const sessions = {};

export const chat = async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Create or retrieve chat session
    if (!sessions[sessionId]) {
      sessions[sessionId] = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: `You are a helpful and friendly assistant for LiVE Unpad (Learning Virtual Environment Universitas Padjadjaran). 
            Use this context to answer questions: \n\n ${knowledgeBase} \n\n 
            Rules: 
            1. Use a friendly, human-like tone. 
            2. If the answer is in the context, rephrase it clearly. 
            3. If the answer is NOT in the context, politely say you don't know and suggest contacting Unpad support.` }],
          },
          {
            role: "model",
            parts: [{ text: "Baik! Saya siap membantu menjawab pertanyaan seputar LiVE Unpad dengan ramah." }],
          },
        ],
      });
    }

    const chatSession = sessions[sessionId];
    const result = await chatSession.sendMessage(message);
    const responseText = result.response.text();

    res.json({ response: responseText });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ response: "Maaf, terjadi kesalahan pada sistem saya." });
  }
};

// This fixes the error you saw earlier!
export const clearSession = async (req, res) => {
  const { sessionId } = req.body;
  try {
    if (sessions[sessionId]) {
      delete sessions[sessionId];
    }
    res.status(200).json({ message: "Session cleared successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};