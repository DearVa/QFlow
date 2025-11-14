import { Router } from 'express';
import { getBinanceClient } from '../services/binanceClient';

const router = Router();
const client = getBinanceClient();

router.get('/intervals', (_req, res) => {
  res.json({ intervals: client.getSupportedIntervals() });
});

router.get('/perpetuals', (_req, res) => {
  res.json({ symbols: client.getPerpetualMarkets() });
});

export default router;
