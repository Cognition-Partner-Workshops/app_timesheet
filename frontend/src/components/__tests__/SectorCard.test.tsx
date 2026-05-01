import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SectorCard } from '../SectorCard';
import type { TopStock } from '../../types';

const mockStock: TopStock = {
  sector_id: 1,
  sector_name: 'Technology',
  icon_name: 'cpu',
  id: 1,
  symbol: 'AAPL',
  company_name: 'Apple Inc.',
  current_price: 185.50,
  day_change_pct: 2.35,
  composite_score: 85,
  score_breakdown: {
    intraday_change: 90,
    volume_ratio: 75,
    rsi: 80,
    price_vs_ma50: 70,
    price_vs_ma200: 65,
    pe_ratio: 60,
    eps_growth: 85,
    week52_position: 72,
    market_cap: 95,
    dividend_yield: 30,
  },
  last_updated: new Date().toISOString(),
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('SectorCard', () => {
  test('renders sector name and stock info', () => {
    renderWithRouter(<SectorCard stock={mockStock} />);
    expect(screen.getByText('Technology')).toBeDefined();
    expect(screen.getByText('AAPL')).toBeDefined();
    expect(screen.getByText('Apple Inc.')).toBeDefined();
  });

  test('displays price and positive change', () => {
    renderWithRouter(<SectorCard stock={mockStock} />);
    expect(screen.getByText('$185.50')).toBeDefined();
    expect(screen.getByText('+2.35%')).toBeDefined();
  });

  test('displays negative change correctly', () => {
    const negativeStock = { ...mockStock, day_change_pct: -1.5 };
    renderWithRouter(<SectorCard stock={negativeStock} />);
    expect(screen.getByText('-1.50%')).toBeDefined();
  });

  test('displays composite score', () => {
    renderWithRouter(<SectorCard stock={mockStock} />);
    expect(screen.getByText('85')).toBeDefined();
  });
});
