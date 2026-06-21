import { OpenAI } from 'openai';

// Initialize OpenAI client but point it to the Groq API
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

export const getAIReply = async (message) => {
  try {
    const completion = await groq.chat.completions.create({
      model: process.env.LLM_MODEL || 'llama-3.3-70b-versatile', 
      messages: [
        { 
          role: 'system', 
          content: 'Kamu adalah asisten akademik LiVE Unpad (Learning Innovation and Virtual Education) Universitas Padjadjaran. Jawab pertanyaan mahasiswa dengan sopan dan informatif.' 
        },
        { role: 'user', content: message },
      ],
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error fetching Groq reply:', error);
    throw error;
  }
};