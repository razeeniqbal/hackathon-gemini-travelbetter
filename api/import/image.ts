import type { VercelRequest, VercelResponse } from '@vercel/node';
import { extractFromImage } from '../../lib/backend/geminiService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Remove data:image/jpeg;base64, prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const activities = await extractFromImage(cleanBase64);

    return res.status(200).json({
      success: true,
      activities,
      source: 'SCREENSHOT'
    });
  } catch (error: any) {
    console.error('Error in /api/import/image:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}
