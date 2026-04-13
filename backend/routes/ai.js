const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getAIReply = async (message) => {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Kamu adalah asisten akademik Magister Ilmu Manajemen Unpad. Jawab pertanyaan mahasiswa dengan sopan dan informatif.' },
      { role: 'user', content: message },
    ],
  });
  return completion.choices[0].message.content;
};

module.exports = { getAIReply };