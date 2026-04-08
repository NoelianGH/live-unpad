import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { generateTitle } from '@/lib/ai'

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

  try {
    const { message } = req.body

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message is required' })
    }

    // Create new conversation with first message
    const conversation = await prisma.conversation.create({
      data: {
        title: generateTitle(message),
        messages: {
          create: {
            role: 'user',
            content: message,
          },
        },
      },
      include: {
        messages: true,
      },
    })

    res.status(201).json({ success: true, data: conversation })
  } catch (error) {
    console.error('Error creating conversation:', error)
    res.status(500).json({ success: false, error: 'Failed to create conversation' })
  }
}
