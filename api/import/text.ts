import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractFromText } from '../../lib/backend/geminiService.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const activities = await extractFromText(text);

    return res.status(200).json({
      success: true,
      activities,
      source: 'TEXT'
    });
  } catch (error: any) {
    console.error('Error in /api/import/text:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}
