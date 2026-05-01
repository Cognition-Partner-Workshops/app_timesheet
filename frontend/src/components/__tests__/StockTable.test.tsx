import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StockTable } from '../StockTable';
import type { Stock } from '../../types';

vi.mock('../../services/api', () => ({
  fetchPriceHistory: vi.fn().mockResolvedValue([]),
}));

const mockStocks: Stock[] = [
  {
    id: 1, symbol: 'AAPL', company_name: 'Apple Inc.', sector_id: 1,
    market_cap: 2800000000000, current_price: 185.50, previous_close: 183.0,
    day_change_pct: 1.37, volume: 55000000, avg_volume: 50000000,
    pe_ratio: 29.5, eps: 6.28, eps_growth_yoy: 12.3, dividend_yield: 0.52,
    beta: 1.28, fifty_two_week_high: 199.62, fifty_two_week_low: 124.17,
    rsi_14: 55.2, ma_50: 178.30, ma_200: 165.40, composite_score: 85,
    score_breakdown: { intraday_change: 90, volume_ratio: 75, rsi: 80,
      price_vs_ma50: 70, price_vs_ma200: 65, pe_ratio: 60, eps_growth: 85,
      week52_position: 72, market_cap: 95, dividend_yield: 30 },
    last_updated: new Date().toISOString(),
  },
  {
    id: 2, symbol: 'MSFT', company_name: 'Microsoft Corporation', sector_id: 1,
    market_cap: 2700000000000, current_price: 405.20, previous_close: 400.0,
    day_change_pct: 1.30, volume: 22000000, avg_volume: 25000000,
    pe_ratio: 35.2, eps: 11.5, eps_growth_yoy: 18.5, dividend_yield: 0.73,
    beta: 0.89, fifty_two_week_high: 420.82, fifty_two_week_low: 275.37,
    rsi_14: 62.1, ma_50: 390.50, ma_200: 360.20, composite_score: 82,
    score_breakdown: { intraday_change: 80, volume_ratio: 60, rsi: 72,
      price_vs_ma50: 75, price_vs_ma200: 80, pe_ratio: 55, eps_growth: 90,
      week52_position: 85, market_cap: 92, dividend_yield: 35 },
    last_updated: new Date().toISOString(),
  },
];

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('StockTable', () => {
  test('renders table with column headers', () => {
    renderWithProviders(<StockTable stocks={mockStocks} />);
    expect(screen.getByText('Rank')).toBeDefined();
    expect(screen.getByText('Ticker')).toBeDefined();
    expect(screen.getByText('Company')).toBeDefined();
    expect(screen.getByText('Price')).toBeDefined();
    expect(screen.getByText('Score')).toBeDefined();
  });

  test('renders stock rows with correct data', () => {
    renderWithProviders(<StockTable stocks={mockStocks} />);
    expect(screen.getByText('AAPL')).toBeDefined();
    expect(screen.getByText('MSFT')).toBeDefined();
    expect(screen.getByText('$185.50')).toBeDefined();
    expect(screen.getByText('$405.20')).toBeDefined();
  });

  test('displays correct rank numbers', () => {
    renderWithProviders(<StockTable stocks={mockStocks} />);
    expect(screen.getByText('1')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });
});
