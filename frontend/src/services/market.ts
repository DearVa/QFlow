import axios from 'axios';
import type { MarketSymbolMetadataResponse, SupportedIntervalsResponse } from '@/types/market';

export const fetchSupportedIntervals = async (): Promise<string[]> => {
  const { data } = await axios.get<SupportedIntervalsResponse>('/api/market/intervals');
  return data.intervals;
};

export const fetchPerpetualSymbols = async () => {
  const { data } = await axios.get<MarketSymbolMetadataResponse>('/api/market/perpetuals');
  return data.symbols;
};
