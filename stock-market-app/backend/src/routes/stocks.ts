import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { getCached, setCache } from '../config/redis';

const router = Router();

/** GET /api/top-stocks — Best single stock from every sector */
router.get('/top-stocks', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'stock:top-all';
    const cached = await getCached(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const result = await query(`
      SELECT DISTINCT ON (sec.id)
        sec.id as sector_id, sec.name as sector_name, sec.icon_name,
        s.id, s.symbol, s.company_name, s.current_price, s.day_change_pct,
        s.composite_score, s.score_breakdown, s.last_updated
      FROM stocks s
      JOIN sectors sec ON s.sector_id = sec.id
      ORDER BY sec.id, s.composite_score DESC
    `);

    await setCache(cacheKey, JSON.stringify(result.rows));
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching top stocks:', err);
    res.status(500).json({ error: 'Failed to fetch top stocks', code: 500 });
  }
});

/** GET /api/stocks/:symbol — Full detail for one stock */
router.get('/stocks/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `stock:detail:${symbol.toUpperCase()}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const result = await query(
      `SELECT s.*, sec.name as sector_name, sec.description as sector_description,
              sec.icon_name as sector_icon
       FROM stocks s
       JOIN sectors sec ON s.sector_id = sec.id
       WHERE UPPER(s.symbol) = UPPER($1)`,
      [symbol]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: `Stock "${symbol}" not found`, code: 404 });
      return;
    }

    await setCache(cacheKey, JSON.stringify(result.rows[0]));
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching stock detail:', err);
    res.status(500).json({ error: 'Failed to fetch stock detail', code: 500 });
  }
});

/** GET /api/stocks/:symbol/price-history — Price history with range */
router.get('/stocks/:symbol/price-history', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const range = (req.query.range as string) || '7d';
    const cacheKey = `stock:history:${symbol.toUpperCase()}:${range}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    // Map range to interval
    const rangeMap: Record<string, string> = {
      '1d': '1 day',
      '7d': '7 days',
      '1m': '1 month',
      '3m': '3 months',
      '1y': '1 year',
    };

    const interval = rangeMap[range] || '7 days';

    const stockResult = await query(
      'SELECT id FROM stocks WHERE UPPER(symbol) = UPPER($1)',
      [symbol]
    );

    if (stockResult.rows.length === 0) {
      res.status(404).json({ error: `Stock "${symbol}" not found`, code: 404 });
      return;
    }

    const stockId = stockResult.rows[0].id;

    const result = await query(
      `SELECT date, open, high, low, close, volume
       FROM price_history
       WHERE stock_id = $1 AND date >= CURRENT_DATE - INTERVAL '${interval}'
       ORDER BY date ASC`,
      [stockId]
    );

    await setCache(cacheKey, JSON.stringify(result.rows));
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching price history:', err);
    res.status(500).json({ error: 'Failed to fetch price history', code: 500 });
  }
});

/** GET /api/daily-digest — Daily digest of top picks per sector */
router.get('/daily-digest', async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const cacheKey = `digest:${date}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const result = await query(
      `SELECT DISTINCT ON (sec.id)
        sec.name as sector, s.symbol, s.company_name as company,
        s.current_price as price, s.day_change_pct as change_pct,
        s.composite_score, s.score_breakdown
       FROM stocks s
       JOIN sectors sec ON s.sector_id = sec.id
       ORDER BY sec.id, s.composite_score DESC`
    );

    const digest = {
      date,
      generated_at: new Date().toISOString(),
      top_picks: result.rows,
    };

    await setCache(cacheKey, JSON.stringify(digest));
    res.json(digest);
  } catch (err) {
    console.error('Error generating daily digest:', err);
    res.status(500).json({ error: 'Failed to generate daily digest', code: 500 });
  }
});

export default router;
