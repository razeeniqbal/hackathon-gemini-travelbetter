import express from 'express';
import {
  extractFromText,
  extractFromImage,
  extractFromXHSLink,
  extractFromXHSScreenshot,
  identifyLandmark
} from '../services/geminiService.js';

const router = express.Router();

// POST /api/import/text
router.post('/text', async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const activities = await extractFromText(text);

    res.json({
      success: true,
      activities,
      source: 'TEXT'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/import/image
router.post('/image', async (req, res, next) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Remove data:image/jpeg;base64, prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const activities = await extractFromImage(cleanBase64);

    res.json({
      success: true,
      activities,
      source: 'SCREENSHOT'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/import/xhs-link
router.post('/xhs-link', async (req, res, next) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'XHS URL is required' });
    }

    const activities = await extractFromXHSLink(url);

    res.json({
      success: true,
      activities,
      source: 'XHS_LINK'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/import/xhs-screenshot
router.post('/xhs-screenshot', async (req, res, next) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'XHS screenshot is required' });
    }

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const activities = await extractFromXHSScreenshot(cleanBase64);

    res.json({
      success: true,
      activities,
      source: 'XHS_SCREENSHOT'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/import/ar-scan
router.post('/ar-scan', async (req, res, next) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const activity = await identifyLandmark(cleanBase64);

    res.json({
      success: true,
      activity,
      source: 'AR_SCAN'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
