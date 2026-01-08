import type { VercelRequest, VercelResponse } from '@vercel/node';
import { optimizeTripRoute } from '../../lib/backend/clusteringService.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tripId } = req.body;

    if (!tripId) {
      return res.status(400).json({ error: 'Trip ID is required' });
    }

    // Optimize route using AI
    await optimizeTripRoute(tripId);

    return res.status(200).json({
      success: true,
      message: 'Route optimized successfully'
    });
  } catch (error: any) {
    console.error('Error in /api/routing/optimize:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}
