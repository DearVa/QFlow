import { Router } from 'express';
import { BinanceClient } from '../services/binanceClient';

const router = Router();
const client = new BinanceClient();

router.get('/candles', async (req, res) => {
  const { symbol = 'BTCUSDT', interval = '1h', limit = 200 } = req.query;
  try {
    const candles = await client.getCandles(symbol as string, interval as string, Number(limit));
    res.json(candles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load Binance candles' });
  }
});

export default router;
