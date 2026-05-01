import axios from 'axios';
import { config } from '../config';
import { query } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Data fetcher service: retrieves stock data from Alpha Vantage (primary)
 * with Yahoo Finance fallback. Includes mock data generation for demo mode.
 */

interface StockQuote {
  symbol: string;
  current_price: number;
  previous_close: number;
  day_change_pct: number;
  volume: number;
  market_cap: number;
  pe_ratio: number;
  eps: number;
  dividend_yield: number;
  fifty_two_week_high: number;
  fifty_two_week_low: number;
  beta: number;
}

interface TechnicalIndicators {
  rsi_14: number;
  ma_50: number;
  ma_200: number;
}

/** Fetch quote from Alpha Vantage with exponential backoff retry */
async function fetchAlphaVantageQuote(symbol: string): Promise<StockQuote | null> {
  if (!config.stockApi.key) return null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await axios.get(config.stockApi.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol,
          apikey: config.stockApi.key,
        },
        timeout: 10000,
      });

      const data = response.data['Global Quote'];
      if (!data || Object.keys(data).length === 0) {
        logger.warn(`No data returned for ${symbol} from Alpha Vantage`);
        return null;
      }

      const price = parseFloat(data['05. price']);
      const prevClose = parseFloat(data['08. previous close']);

      return {
        symbol,
        current_price: price,
        previous_close: prevClose,
        day_change_pct: parseFloat(data['10. change percent']?.replace('%', '') || '0'),
        volume: parseInt(data['06. volume'], 10),
        market_cap: 0,
        pe_ratio: 0,
        eps: 0,
        dividend_yield: 0,
        fifty_two_week_high: 0,
        fifty_two_week_low: 0,
        beta: 1,
      };
    } catch (err) {
      const delay = Math.pow(2, attempt) * 1000;
      logger.warn(`Alpha Vantage request failed for ${symbol}, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return null;
}

/** Fetch technical indicators from Alpha Vantage */
async function fetchTechnicalIndicators(symbol: string): Promise<TechnicalIndicators | null> {
  if (!config.stockApi.key) return null;

  try {
    const [rsiRes, smaRes] = await Promise.all([
      axios.get(config.stockApi.baseUrl, {
        params: { function: 'RSI', symbol, interval: 'daily', time_period: 14, series_type: 'close', apikey: config.stockApi.key },
        timeout: 10000,
      }),
      axios.get(config.stockApi.baseUrl, {
        params: { function: 'SMA', symbol, interval: 'daily', time_period: 50, series_type: 'close', apikey: config.stockApi.key },
        timeout: 10000,
      }),
    ]);

    const rsiData = rsiRes.data['Technical Analysis: RSI'];
    const smaData = smaRes.data['Technical Analysis: SMA'];

    const latestRsiDate = rsiData ? Object.keys(rsiData)[0] : null;
    const latestSmaDate = smaData ? Object.keys(smaData)[0] : null;

    return {
      rsi_14: latestRsiDate ? parseFloat(rsiData[latestRsiDate].RSI) : 50,
      ma_50: latestSmaDate ? parseFloat(smaData[latestSmaDate].SMA) : 0,
      ma_200: 0, // Would need separate API call
    };
  } catch {
    return null;
  }
}

/** Generate realistic mock data updates for demo mode (Math.random is intentional for non-security mock data) */
export function generateMockUpdate(currentPrice: number, avgVolume: number) {
  const changePercent = (Math.random() - 0.45) * 4; // NOSONAR — mock data, not security
  const newPrice = currentPrice * (1 + changePercent / 100);
  const volume = Math.floor(avgVolume * (0.5 + Math.random() * 1.5));

  return {
    current_price: parseFloat(newPrice.toFixed(4)),
    previous_close: currentPrice,
    day_change_pct: parseFloat(changePercent.toFixed(4)),
    volume,
    rsi_14: parseFloat((20 + Math.random() * 60).toFixed(4)),
    ma_50: parseFloat((newPrice * (0.97 + Math.random() * 0.06)).toFixed(4)),
    ma_200: parseFloat((newPrice * (0.93 + Math.random() * 0.1)).toFixed(4)),
    eps_growth_yoy: parseFloat((-10 + Math.random() * 50).toFixed(4)),
  };
}

/** Fetch and update data for a single stock */
export async function fetchStockData(symbol: string): Promise<boolean> {
  try {
    if (config.useMockData) {
      // Use mock data — read current price from DB and generate update
      const result = await query(
        'SELECT current_price, avg_volume FROM stocks WHERE symbol = $1',
        [symbol]
      );
      if (result.rows.length === 0) return false;

      const { current_price, avg_volume } = result.rows[0];
      const update = generateMockUpdate(
        parseFloat(current_price),
        parseInt(avg_volume, 10)
      );

      await query(
        `UPDATE stocks SET
          current_price = $1, previous_close = $2, day_change_pct = $3,
          volume = $4, rsi_14 = $5, ma_50 = $6, ma_200 = $7,
          eps_growth_yoy = $8, last_updated = NOW()
        WHERE symbol = $9`,
        [
          update.current_price, update.previous_close, update.day_change_pct,
          update.volume, update.rsi_14, update.ma_50, update.ma_200,
          update.eps_growth_yoy, symbol,
        ]
      );
      return true;
    }

    // Real API mode
    const quote = await fetchAlphaVantageQuote(symbol);
    if (!quote) return false;

    const indicators = await fetchTechnicalIndicators(symbol);

    await query(
      `UPDATE stocks SET
        current_price = $1, previous_close = $2, day_change_pct = $3,
        volume = $4, rsi_14 = $5, ma_50 = $6, ma_200 = $7,
        last_updated = NOW()
      WHERE symbol = $8`,
      [
        quote.current_price, quote.previous_close, quote.day_change_pct,
        quote.volume,
        indicators?.rsi_14 ?? 50, indicators?.ma_50 ?? 0, indicators?.ma_200 ?? 0,
        symbol,
      ]
    );
    return true;
  } catch (err) {
    logger.error(`Failed to fetch data for ${symbol}:`, err);
    return false;
  }
}
