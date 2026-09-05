import { Router, Request, Response } from 'express';
import { generateMarketBriefing } from '../../services/intelligence.js';

export const intelligenceRouter = Router();

// /api/v1/intelligence/briefing
intelligenceRouter.post('/briefing', async (req: Request, res: Response) => {
  try {
    const { symbol, contextData, taskId, providerId, model, providerName } = req.body;

    if (!symbol || !contextData) {
       res.status(400).json({ error: 'Missing required fields: symbol, contextData' });
       return;
    }

    // Call the AI intelligence service with selected model & provider
    const result = await generateMarketBriefing({ symbol, contextData, taskId, providerId, model, providerName });

    res.json({
      status: 'success',
      data: result
    });
  } catch (error: any) {
    console.error('Error generating briefing:', error);
    res.status(500).json({ 
      error: 'Failed to generate market briefing',
      details: error.message 
    });
  }
});
