import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import marketRouter from './routes/market';
import strategyRouter from './routes/strategy';
import { attachStrategySocket } from './websocket/strategySocket';
import { attachMarketSocket } from './websocket/marketSocket';

const app = express();
app.use(cors());
app.use(json());

app.use('/api/market', marketRouter);
app.use('/api/strategy', strategyRouter);

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  console.log(`API ready on port ${port}`);
});

attachStrategySocket(server);
attachMarketSocket(server);
