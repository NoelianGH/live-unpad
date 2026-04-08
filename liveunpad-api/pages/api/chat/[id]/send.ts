import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { generateAIResponse } from '@/lib/ai'

type ResponseData = {
  success: boolean
  data?: any
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { id } = req.query
  const { message } = req.body

  if (typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid conversation ID' })
  }

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, error: 'Message is required' })
  }

  try {
    // Add user message
    await prisma.message.create({
      data: {
        conversationId: id,
        role: 'user',
        content: message,
      },
    })

    // Get conversation history for context
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' })
    }

    // Generate AI response
    try {
      const aiResponse = await generateAIResponse(
        conversation.messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }))
      )

      // Save AI response
      const assistantMessage = await prisma.message.create({
        data: {
          conversationId: id,
          role: 'assistant',
          content: aiResponse,
        },
      })

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      })

      res.status(200).json({ success: true, data: assistantMessage })
    } catch (aiError) {
      console.error('AI generation error:', aiError)
      // Still save the user message even if AI fails
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate AI response. Please configure an AI provider.' 
      })
    }
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ success: false, error: 'Failed to send message' })
  }
}
