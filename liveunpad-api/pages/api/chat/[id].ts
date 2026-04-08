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
  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid conversation ID' })
  }

  if (req.method === 'GET') {
    try {
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

      res.status(200).json({ success: true, data: conversation })
    } catch (error) {
      console.error('Error fetching conversation:', error)
      res.status(500).json({ success: false, error: 'Failed to fetch conversation' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const conversation = await prisma.conversation.delete({
        where: { id },
      })

      res.status(200).json({ success: true, data: conversation })
    } catch (error) {
      console.error('Error deleting conversation:', error)
      res.status(500).json({ success: false, error: 'Failed to delete conversation' })
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' })
  }
}
