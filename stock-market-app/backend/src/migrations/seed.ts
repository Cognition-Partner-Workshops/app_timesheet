import { pool } from '../config/database';

/**
 * Seed data: 11 sectors and 10+ well-known tickers per sector.
 * Also generates initial mock price/indicator data for demo mode.
 */

interface SectorSeed {
  name: string;
  description: string;
  icon_name: string;
  stocks: Array<{ symbol: string; company_name: string }>;
}

const sectors: SectorSeed[] = [
  {
    name: 'Technology',
    description: 'Companies involved in software, hardware, semiconductors, and IT services',
    icon_name: 'cpu',
    stocks: [
      { symbol: 'AAPL', company_name: 'Apple Inc.' },
      { symbol: 'MSFT', company_name: 'Microsoft Corporation' },
      { symbol: 'GOOGL', company_name: 'Alphabet Inc.' },
      { symbol: 'NVDA', company_name: 'NVIDIA Corporation' },
      { symbol: 'META', company_name: 'Meta Platforms Inc.' },
      { symbol: 'TSM', company_name: 'Taiwan Semiconductor' },
      { symbol: 'AVGO', company_name: 'Broadcom Inc.' },
      { symbol: 'ORCL', company_name: 'Oracle Corporation' },
      { symbol: 'CRM', company_name: 'Salesforce Inc.' },
      { symbol: 'ADBE', company_name: 'Adobe Inc.' },
    ],
  },
  {
    name: 'Healthcare',
    description: 'Pharmaceuticals, biotechnology, medical devices, and health services',
    icon_name: 'heart-pulse',
    stocks: [
      { symbol: 'JNJ', company_name: 'Johnson & Johnson' },
      { symbol: 'UNH', company_name: 'UnitedHealth Group' },
      { symbol: 'PFE', company_name: 'Pfizer Inc.' },
      { symbol: 'ABBV', company_name: 'AbbVie Inc.' },
      { symbol: 'MRK', company_name: 'Merck & Co.' },
      { symbol: 'LLY', company_name: 'Eli Lilly and Company' },
      { symbol: 'TMO', company_name: 'Thermo Fisher Scientific' },
      { symbol: 'ABT', company_name: 'Abbott Laboratories' },
      { symbol: 'DHR', company_name: 'Danaher Corporation' },
      { symbol: 'BMY', company_name: 'Bristol-Myers Squibb' },
    ],
  },
  {
    name: 'Finance',
    description: 'Banks, insurance companies, investment firms, and financial services',
    icon_name: 'landmark',
    stocks: [
      { symbol: 'JPM', company_name: 'JPMorgan Chase & Co.' },
      { symbol: 'BAC', company_name: 'Bank of America Corp.' },
      { symbol: 'GS', company_name: 'Goldman Sachs Group' },
      { symbol: 'MS', company_name: 'Morgan Stanley' },
      { symbol: 'WFC', company_name: 'Wells Fargo & Co.' },
      { symbol: 'C', company_name: 'Citigroup Inc.' },
      { symbol: 'BLK', company_name: 'BlackRock Inc.' },
      { symbol: 'SCHW', company_name: 'Charles Schwab Corp.' },
      { symbol: 'AXP', company_name: 'American Express Co.' },
      { symbol: 'USB', company_name: 'U.S. Bancorp' },
    ],
  },
  {
    name: 'Energy',
    description: 'Oil, gas, renewable energy, and energy infrastructure companies',
    icon_name: 'zap',
    stocks: [
      { symbol: 'XOM', company_name: 'Exxon Mobil Corporation' },
      { symbol: 'CVX', company_name: 'Chevron Corporation' },
      { symbol: 'COP', company_name: 'ConocoPhillips' },
      { symbol: 'SLB', company_name: 'Schlumberger Limited' },
      { symbol: 'EOG', company_name: 'EOG Resources Inc.' },
      { symbol: 'MPC', company_name: 'Marathon Petroleum Corp.' },
      { symbol: 'PSX', company_name: 'Phillips 66' },
      { symbol: 'VLO', company_name: 'Valero Energy Corp.' },
      { symbol: 'OXY', company_name: 'Occidental Petroleum' },
      { symbol: 'HAL', company_name: 'Halliburton Company' },
    ],
  },
  {
    name: 'Consumer Discretionary',
    description: 'Retail, automotive, entertainment, and luxury goods companies',
    icon_name: 'shopping-cart',
    stocks: [
      { symbol: 'AMZN', company_name: 'Amazon.com Inc.' },
      { symbol: 'TSLA', company_name: 'Tesla Inc.' },
      { symbol: 'HD', company_name: 'The Home Depot Inc.' },
      { symbol: 'NKE', company_name: 'Nike Inc.' },
      { symbol: 'MCD', company_name: "McDonald's Corporation" },
      { symbol: 'SBUX', company_name: 'Starbucks Corporation' },
      { symbol: 'LOW', company_name: "Lowe's Companies Inc." },
      { symbol: 'TJX', company_name: 'TJX Companies Inc.' },
      { symbol: 'BKNG', company_name: 'Booking Holdings Inc.' },
      { symbol: 'CMG', company_name: 'Chipotle Mexican Grill' },
    ],
  },
  {
    name: 'Industrials',
    description: 'Aerospace, defense, machinery, and industrial conglomerates',
    icon_name: 'factory',
    stocks: [
      { symbol: 'CAT', company_name: 'Caterpillar Inc.' },
      { symbol: 'BA', company_name: 'Boeing Company' },
      { symbol: 'HON', company_name: 'Honeywell International' },
      { symbol: 'UPS', company_name: 'United Parcel Service' },
      { symbol: 'RTX', company_name: 'RTX Corporation' },
      { symbol: 'DE', company_name: 'Deere & Company' },
      { symbol: 'LMT', company_name: 'Lockheed Martin Corp.' },
      { symbol: 'GE', company_name: 'GE Aerospace' },
      { symbol: 'MMM', company_name: '3M Company' },
      { symbol: 'FDX', company_name: 'FedEx Corporation' },
    ],
  },
  {
    name: 'Utilities',
    description: 'Electric, gas, water utilities and renewable energy providers',
    icon_name: 'lightbulb',
    stocks: [
      { symbol: 'NEE', company_name: 'NextEra Energy Inc.' },
      { symbol: 'DUK', company_name: 'Duke Energy Corporation' },
      { symbol: 'SO', company_name: 'Southern Company' },
      { symbol: 'D', company_name: 'Dominion Energy Inc.' },
      { symbol: 'AEP', company_name: 'American Electric Power' },
      { symbol: 'EXC', company_name: 'Exelon Corporation' },
      { symbol: 'SRE', company_name: 'Sempra Energy' },
      { symbol: 'XEL', company_name: 'Xcel Energy Inc.' },
      { symbol: 'WEC', company_name: 'WEC Energy Group' },
      { symbol: 'ED', company_name: 'Consolidated Edison' },
    ],
  },
  {
    name: 'Materials',
    description: 'Chemicals, metals, mining, and construction materials',
    icon_name: 'gem',
    stocks: [
      { symbol: 'LIN', company_name: 'Linde plc' },
      { symbol: 'APD', company_name: 'Air Products & Chemicals' },
      { symbol: 'SHW', company_name: 'Sherwin-Williams Co.' },
      { symbol: 'FCX', company_name: 'Freeport-McMoRan Inc.' },
      { symbol: 'NEM', company_name: 'Newmont Corporation' },
      { symbol: 'ECL', company_name: 'Ecolab Inc.' },
      { symbol: 'DOW', company_name: 'Dow Inc.' },
      { symbol: 'NUE', company_name: 'Nucor Corporation' },
      { symbol: 'DD', company_name: 'DuPont de Nemours' },
      { symbol: 'VMC', company_name: 'Vulcan Materials Co.' },
    ],
  },
  {
    name: 'Real Estate',
    description: 'REITs, real estate services, and property development',
    icon_name: 'building',
    stocks: [
      { symbol: 'PLD', company_name: 'Prologis Inc.' },
      { symbol: 'AMT', company_name: 'American Tower Corp.' },
      { symbol: 'CCI', company_name: 'Crown Castle Inc.' },
      { symbol: 'EQIX', company_name: 'Equinix Inc.' },
      { symbol: 'PSA', company_name: 'Public Storage' },
      { symbol: 'SPG', company_name: 'Simon Property Group' },
      { symbol: 'O', company_name: 'Realty Income Corp.' },
      { symbol: 'WELL', company_name: 'Welltower Inc.' },
      { symbol: 'DLR', company_name: 'Digital Realty Trust' },
      { symbol: 'AVB', company_name: 'AvalonBay Communities' },
    ],
  },
  {
    name: 'Communication Services',
    description: 'Telecom, media, entertainment, and interactive services',
    icon_name: 'radio',
    stocks: [
      { symbol: 'GOOG', company_name: 'Alphabet Inc. Class C' },
      { symbol: 'DIS', company_name: 'Walt Disney Company' },
      { symbol: 'NFLX', company_name: 'Netflix Inc.' },
      { symbol: 'CMCSA', company_name: 'Comcast Corporation' },
      { symbol: 'T', company_name: 'AT&T Inc.' },
      { symbol: 'VZ', company_name: 'Verizon Communications' },
      { symbol: 'TMUS', company_name: 'T-Mobile US Inc.' },
      { symbol: 'CHTR', company_name: 'Charter Communications' },
      { symbol: 'EA', company_name: 'Electronic Arts Inc.' },
      { symbol: 'TTWO', company_name: 'Take-Two Interactive' },
    ],
  },
  {
    name: 'Consumer Staples',
    description: 'Food, beverages, household products, and personal care',
    icon_name: 'package',
    stocks: [
      { symbol: 'PG', company_name: 'Procter & Gamble Co.' },
      { symbol: 'KO', company_name: 'Coca-Cola Company' },
      { symbol: 'PEP', company_name: 'PepsiCo Inc.' },
      { symbol: 'COST', company_name: 'Costco Wholesale Corp.' },
      { symbol: 'WMT', company_name: 'Walmart Inc.' },
      { symbol: 'PM', company_name: 'Philip Morris Intl.' },
      { symbol: 'MO', company_name: 'Altria Group Inc.' },
      { symbol: 'CL', company_name: 'Colgate-Palmolive Co.' },
      { symbol: 'KMB', company_name: 'Kimberly-Clark Corp.' },
      { symbol: 'GIS', company_name: 'General Mills Inc.' },
    ],
  },
];

/** Generate realistic random stock data for mock/demo mode */
function generateMockStockData() {
  const basePrice = 50 + Math.random() * 450;
  const prevClose = basePrice * (1 + (Math.random() - 0.5) * 0.02);
  const dayChange = ((basePrice - prevClose) / prevClose) * 100;
  const high52 = basePrice * (1.1 + Math.random() * 0.4);
  const low52 = basePrice * (0.5 + Math.random() * 0.3);
  const volume = Math.floor(1000000 + Math.random() * 50000000);
  const avgVolume = Math.floor(volume * (0.7 + Math.random() * 0.6));

  return {
    market_cap: Math.floor(10e9 + Math.random() * 2e12),
    current_price: parseFloat(basePrice.toFixed(4)),
    previous_close: parseFloat(prevClose.toFixed(4)),
    day_change_pct: parseFloat(dayChange.toFixed(4)),
    volume,
    avg_volume: avgVolume,
    pe_ratio: parseFloat((10 + Math.random() * 40).toFixed(4)),
    eps: parseFloat((1 + Math.random() * 20).toFixed(4)),
    eps_growth_yoy: parseFloat((-10 + Math.random() * 50).toFixed(4)),
    dividend_yield: parseFloat((Math.random() * 5).toFixed(4)),
    beta: parseFloat((0.5 + Math.random() * 1.5).toFixed(4)),
    fifty_two_week_high: parseFloat(high52.toFixed(4)),
    fifty_two_week_low: parseFloat(low52.toFixed(4)),
    rsi_14: parseFloat((20 + Math.random() * 60).toFixed(4)),
    ma_50: parseFloat((basePrice * (0.95 + Math.random() * 0.1)).toFixed(4)),
    ma_200: parseFloat((basePrice * (0.9 + Math.random() * 0.15)).toFixed(4)),
  };
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const sector of sectors) {
      const sectorResult = await client.query(
        `INSERT INTO sectors (name, description, icon_name) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (name) DO UPDATE SET description = $2, icon_name = $3
         RETURNING id`,
        [sector.name, sector.description, sector.icon_name]
      );
      const sectorId = sectorResult.rows[0].id;

      for (const stock of sector.stocks) {
        const data = generateMockStockData();
        await client.query(
          `INSERT INTO stocks (
            symbol, company_name, sector_id, market_cap, current_price,
            previous_close, day_change_pct, volume, avg_volume, pe_ratio,
            eps, eps_growth_yoy, dividend_yield, beta, fifty_two_week_high,
            fifty_two_week_low, rsi_14, ma_50, ma_200, composite_score, last_updated
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,0,NOW())
          ON CONFLICT (symbol) DO UPDATE SET
            company_name=$2, sector_id=$3, market_cap=$4, current_price=$5,
            previous_close=$6, day_change_pct=$7, volume=$8, avg_volume=$9,
            pe_ratio=$10, eps=$11, eps_growth_yoy=$12, dividend_yield=$13,
            beta=$14, fifty_two_week_high=$15, fifty_two_week_low=$16,
            rsi_14=$17, ma_50=$18, ma_200=$19, last_updated=NOW()`,
          [
            stock.symbol, stock.company_name, sectorId,
            data.market_cap, data.current_price, data.previous_close,
            data.day_change_pct, data.volume, data.avg_volume,
            data.pe_ratio, data.eps, data.eps_growth_yoy,
            data.dividend_yield, data.beta, data.fifty_two_week_high,
            data.fifty_two_week_low, data.rsi_14, data.ma_50, data.ma_200,
          ]
        );

        // Insert 30 days of mock price history
        const stockResult = await client.query(
          'SELECT id FROM stocks WHERE symbol = $1',
          [stock.symbol]
        );
        const stockId = stockResult.rows[0].id;
        let price = data.current_price;

        for (let i = 30; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dailyChange = (Math.random() - 0.48) * 0.03;
          price = price * (1 + dailyChange);
          const dayHigh = price * (1 + Math.random() * 0.02);
          const dayLow = price * (1 - Math.random() * 0.02);
          const dayOpen = price * (1 + (Math.random() - 0.5) * 0.01);
          const dayVolume = Math.floor(data.avg_volume * (0.5 + Math.random()));

          await client.query(
            `INSERT INTO price_history (stock_id, date, open, high, low, close, volume)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING`,
            [stockId, date.toISOString().split('T')[0],
             parseFloat(dayOpen.toFixed(4)), parseFloat(dayHigh.toFixed(4)),
             parseFloat(dayLow.toFixed(4)), parseFloat(price.toFixed(4)), dayVolume]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('Seed completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
