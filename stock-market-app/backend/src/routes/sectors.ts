import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { getCached, setCache } from '../config/redis';

const router = Router();

/** GET /api/sectors — List all sectors with stock count */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const cacheKey = 'sectors:all';
    const cached = await getCached(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const result = await query(`
      SELECT s.id, s.name, s.description, s.icon_name,
             COUNT(st.id) as stock_count
      FROM sectors s
      LEFT JOIN stocks st ON st.sector_id = s.id
      GROUP BY s.id, s.name, s.description, s.icon_name
      ORDER BY s.name
    `);

    const data = result.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon_name: row.icon_name,
      stock_count: parseInt(String(row.stock_count), 10),
    }));

    await setCache(cacheKey, JSON.stringify(data));
    res.json(data);
  } catch (err) {
    console.error('Error fetching sectors:', err);
    res.status(500).json({ error: 'Failed to fetch sectors', code: 500 });
  }
});

/** GET /api/sectors/:sectorName/top-stocks — Top N stocks for a sector */
router.get('/:sectorName/top-stocks', async (req: Request, res: Response) => {
  try {
    const { sectorName } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);
    const cacheKey = `sectors:${sectorName}:top:${limit}`;

    const cached = await getCached(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const sectorResult = await query(
      'SELECT id, name, description, icon_name FROM sectors WHERE LOWER(name) = LOWER($1)',
      [sectorName.replace(/-/g, ' ')]
    );

    if (sectorResult.rows.length === 0) {
      res.status(404).json({ error: `Sector "${sectorName}" not found`, code: 404 });
      return;
    }

    const sector = sectorResult.rows[0];

    const stocksResult = await query(
      `SELECT id, symbol, company_name, current_price, previous_close,
              day_change_pct, volume, avg_volume, pe_ratio, rsi_14,
              composite_score, score_breakdown, market_cap, eps,
              eps_growth_yoy, dividend_yield, beta,
              fifty_two_week_high, fifty_two_week_low, ma_50, ma_200,
              last_updated
       FROM stocks
       WHERE sector_id = $1
       ORDER BY composite_score DESC
       LIMIT $2`,
      [sector.id, limit]
    );

    const data = {
      sector: {
        id: sector.id,
        name: sector.name,
        description: sector.description,
        icon_name: sector.icon_name,
      },
      stocks: stocksResult.rows,
    };

    await setCache(cacheKey, JSON.stringify(data));
    res.json(data);
  } catch (err) {
    console.error('Error fetching top stocks:', err);
    res.status(500).json({ error: 'Failed to fetch top stocks', code: 500 });
  }
});

export default router;
