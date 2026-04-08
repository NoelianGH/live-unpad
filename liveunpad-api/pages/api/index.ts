import type { NextApiRequest, NextApiResponse } from 'next'

type ResponseData = {
  message: string
  timestamp: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  res.status(200).json({
    message: 'Welcome to LiveUnpad API',
    timestamp: new Date().toISOString(),
  })
}
