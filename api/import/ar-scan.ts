import type { VercelRequest, VercelResponse } from '@vercel/node';
import { identifyLandmark } from '../../lib/backend/geminiService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const activity = await identifyLandmark(cleanBase64);

    return res.status(200).json({
      success: true,
      activity,
      source: 'AR_SCAN'
    });
  } catch (error: any) {
    console.error('Error in /api/import/ar-scan:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}
