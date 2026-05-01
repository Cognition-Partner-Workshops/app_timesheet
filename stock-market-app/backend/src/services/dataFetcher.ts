import axios from 'axios';
import { config } from '../config';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { secureRandom, randomFloat } from '../utils/random';

/**
 * Data fetcher service: retrieves live stock data from Twelve Data (primary,
 * free tier with demo key), with Alpha Vantage as secondary option.
 * Includes mock data generation for offline/demo mode.
 *
 * Twelve Data free tier: 8 requests/min, 800/day with demo key.
 * Get your own free key at https://twelvedata.com for higher limits.
 */

const TWELVE_DATA_BASE = 'https://api.twelvedata.com';

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

/** Fetch quote from Twelve Data (free, works with 'demo' key) */
async function fetchTwelveDataQuote(symbol: string): Promise<StockQuote | null> {
  const apiKey = config.stockApi.twelveDataKey || 'demo';
  try {
    const response = await axios.get(`${TWELVE_DATA_BASE}/quote`, {
      params: { symbol, apikey: apiKey },
      timeout: 10000,
    });

    const data = response.data;
    if (data.status === 'error' || !data.close) {
      logger.warn(`Twelve Data returned no data for ${symbol}: ${data.message || 'unknown'}`);
      return null;
    }

    const currentPrice = parseFloat(data.close);
    const previousClose = parseFloat(data.previous_close);
    const changePct = parseFloat(data.percent_change);

    return {
      symbol,
      current_price: currentPrice,
      previous_close: previousClose,
      day_change_pct: changePct,
      volume: parseInt(data.volume, 10) || 0,
      market_cap: 0,
      pe_ratio: 0,
      eps: 0,
      dividend_yield: 0,
      fifty_two_week_high: data.fifty_two_week?.high ? parseFloat(data.fifty_two_week.high) : 0,
      fifty_two_week_low: data.fifty_two_week?.low ? parseFloat(data.fifty_two_week.low) : 0,
      beta: 1,
    };
  } catch (err) {
    logger.warn(`Twelve Data quote failed for ${symbol}: ${(err as Error).message}`);
    return null;
  }
}

/** Fetch RSI and SMA indicators from Twelve Data */
async function fetchTwelveDataIndicators(symbol: string): Promise<TechnicalIndicators | null> {
  const apiKey = config.stockApi.twelveDataKey || 'demo';
  try {
    const [rsiRes, sma50Res, sma200Res] = await Promise.all([
      axios.get(`${TWELVE_DATA_BASE}/rsi`, {
        params: { symbol, interval: '1day', time_period: 14, outputsize: 1, apikey: apiKey },
        timeout: 10000,
      }),
      axios.get(`${TWELVE_DATA_BASE}/sma`, {
        params: { symbol, interval: '1day', time_period: 50, outputsize: 1, apikey: apiKey },
        timeout: 10000,
      }),
      axios.get(`${TWELVE_DATA_BASE}/sma`, {
        params: { symbol, interval: '1day', time_period: 200, outputsize: 1, apikey: apiKey },
        timeout: 10000,
      }),
    ]);

    const rsi = rsiRes.data?.values?.[0]?.rsi;
    const sma50 = sma50Res.data?.values?.[0]?.sma;
    const sma200 = sma200Res.data?.values?.[0]?.sma;

    return {
      rsi_14: rsi ? parseFloat(rsi) : 50,
      ma_50: sma50 ? parseFloat(sma50) : 0,
      ma_200: sma200 ? parseFloat(sma200) : 0,
    };
  } catch (err) {
    logger.warn(`Twelve Data indicators failed for ${symbol}: ${(err as Error).message}`);
    return null;
  }
}

/** Fetch quote from Alpha Vantage with exponential backoff retry (secondary) */
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

/** Generate realistic mock data updates for demo mode */
export function generateMockUpdate(currentPrice: number, avgVolume: number) {
  const changePercent = (secureRandom() - 0.45) * 4;
  const newPrice = currentPrice * (1 + changePercent / 100);
  const volume = Math.floor(avgVolume * (0.5 + secureRandom() * 1.5));

  return {
    current_price: parseFloat(newPrice.toFixed(4)),
    previous_close: currentPrice,
    day_change_pct: parseFloat(changePercent.toFixed(4)),
    volume,
    rsi_14: parseFloat(randomFloat(20, 80).toFixed(4)),
    ma_50: parseFloat((newPrice * randomFloat(0.97, 1.03)).toFixed(4)),
    ma_200: parseFloat((newPrice * randomFloat(0.93, 1.03)).toFixed(4)),
    eps_growth_yoy: parseFloat(randomFloat(-10, 40).toFixed(4)),
  };
}

/** Fetch and update data for a single stock */
export async function fetchStockData(symbol: string): Promise<boolean> {
  try {
    if (config.useMockData) {
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

    // Live mode: try Twelve Data first (free), then Alpha Vantage
    const quote = await fetchTwelveDataQuote(symbol) ?? await fetchAlphaVantageQuote(symbol);
    if (!quote) return false;

    const indicators = await fetchTwelveDataIndicators(symbol);

    await query(
      `UPDATE stocks SET
        current_price = $1, previous_close = $2, day_change_pct = $3,
        volume = $4, fifty_two_week_high = $5, fifty_two_week_low = $6,
        rsi_14 = $7, ma_50 = $8, ma_200 = $9,
        last_updated = NOW()
      WHERE symbol = $10`,
      [
        quote.current_price, quote.previous_close, quote.day_change_pct,
        quote.volume, quote.fifty_two_week_high, quote.fifty_two_week_low,
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
