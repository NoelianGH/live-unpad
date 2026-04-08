import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

type ResponseData = {
  success: boolean
  data?: any
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    // Get all conversations
    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Get only the first message for preview
        },
      },
    })

    res.status(200).json({ success: true, data: conversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' })
  }
}
