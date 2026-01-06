import express from 'express';
import {
  clusterAroundHotel,
  applyClusteringToTrip,
  getActivitiesNearHotel,
  optimizeTripRoute
} from '../services/clusteringService.js';

const router = express.Router();

// POST /api/routing/hotel-anchor
router.post('/hotel-anchor', async (req, res, next) => {
  try {
    const { tripId } = req.body;

    if (!tripId) {
      return res.status(400).json({ error: 'Trip ID is required' });
    }

    // Get clustering preview
    const clusters = await clusterAroundHotel(tripId);

    res.json({
      success: true,
      clusters
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/routing/apply-clustering
router.post('/apply-clustering', async (req, res, next) => {
  try {
    const { tripId } = req.body;

    if (!tripId) {
      return res.status(400).json({ error: 'Trip ID is required' });
    }

    // Apply clustering to trip
    await applyClusteringToTrip(tripId);

    res.json({
      success: true,
      message: 'Clustering applied successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/routing/nearby-activities/:tripId
router.get('/nearby-activities/:tripId', async (req, res, next) => {
  try {
    const { tripId } = req.params;
    const radiusMeters = parseInt(req.query.radius as string) || 2000;

    const activities = await getActivitiesNearHotel(tripId, radiusMeters);

    res.json({
      success: true,
      activities
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/routing/optimize
router.post('/optimize', async (req, res, next) => {
  try {
    const { tripId } = req.body;

    if (!tripId) {
      return res.status(400).json({ error: 'Trip ID is required' });
    }

    // Optimize route using AI
    await optimizeTripRoute(tripId);

    res.json({
      success: true,
      message: 'Route optimized successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
