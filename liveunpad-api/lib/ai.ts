// AI Service Integration
// Configure your AI provider here (OpenAI, Anthropic, etc.)

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Generate AI response
 * Replace this with your actual AI API call
 */
export async function generateAIResponse(messages: Message[]): Promise<string> {
  // Example: Using OpenAI API
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    // Fallback response if no API key configured
    return 'Hello! I\'m a chatbot. To enable AI responses, please configure an AI provider (OpenAI, Anthropic, etc.) by setting the appropriate API key in your environment variables.'
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'No response generated'
  } catch (error) {
    console.error('AI error:', error)
    throw error
  }
}

/**
 * Generate conversation title from first message
 */
export function generateTitle(firstMessage: string): string {
  // Take first 50 characters or first sentence
  const title = firstMessage.substring(0, 50)
  return title.length < firstMessage.length ? title + '...' : title
}
