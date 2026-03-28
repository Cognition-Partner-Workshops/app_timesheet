import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityFeed, {
  formatRelativeDate,
  calculateTrend,
  renderMarkdownDescription,
  type ActivityItem,
} from '../ActivityFeed';

vi.mock('marked', () => ({
  marked: {
    parse: (input: string) => `<p>${input}</p>`,
  },
}));

describe('ActivityFeed', () => {
  describe('formatRelativeDate', () => {
    it('returns "Today" for today\'s date', () => {
      const today = new Date().toISOString();
      expect(formatRelativeDate(today)).toBe('Today');
    });

    it('returns "Yesterday" for yesterday\'s date', () => {
      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(yesterday)).toBe('Yesterday');
    });

    it('returns "X days ago" for dates 2-6 days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(threeDaysAgo)).toBe('3 days ago');
    });

    it('returns "X weeks ago" for dates 7-29 days ago', () => {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(fourteenDaysAgo)).toBe('2 weeks ago');
    });

    it('returns locale date string for dates 30+ days ago', () => {
      const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const result = formatRelativeDate(old.toISOString());
      expect(result).toBe(old.toLocaleDateString());
    });
  });

  describe('calculateTrend', () => {
    it('returns flat with 0% for fewer than 2 items', () => {
      const result = calculateTrend([]);
      expect(result).toEqual({ direction: 'flat', percentage: 0 });
    });

    it('returns flat with 0% for a single item', () => {
      const items: ActivityItem[] = [
        { id: 1, clientName: 'A', hours: 5, date: new Date().toISOString(), description: null, type: 'entry' },
      ];
      expect(calculateTrend(items)).toEqual({ direction: 'flat', percentage: 0 });
    });

    it('returns up when this week has hours and last week has none', () => {
      const now = new Date();
      const items: ActivityItem[] = [
        { id: 1, clientName: 'A', hours: 5, date: now.toISOString(), description: null, type: 'entry' },
        { id: 2, clientName: 'B', hours: 3, date: now.toISOString(), description: null, type: 'entry' },
      ];
      const result = calculateTrend(items);
      expect(result.direction).toBe('up');
      expect(result.percentage).toBe(100);
    });

    it('returns flat when this week has 0 hours and last week has 0 hours', () => {
      const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const items: ActivityItem[] = [
        { id: 1, clientName: 'A', hours: 5, date: old.toISOString(), description: null, type: 'entry' },
        { id: 2, clientName: 'B', hours: 3, date: old.toISOString(), description: null, type: 'entry' },
      ];
      const result = calculateTrend(items);
      expect(result.direction).toBe('flat');
      expect(result.percentage).toBe(100);
    });

    it('returns up when this week hours exceed last week', () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const items: ActivityItem[] = [
        { id: 1, clientName: 'A', hours: 10, date: now.toISOString(), description: null, type: 'entry' },
        { id: 2, clientName: 'B', hours: 5, date: lastWeek.toISOString(), description: null, type: 'entry' },
      ];
      const result = calculateTrend(items);
      expect(result.direction).toBe('up');
      expect(result.percentage).toBe(100);
    });

    it('returns down when this week hours are less than last week', () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const items: ActivityItem[] = [
        { id: 1, clientName: 'A', hours: 2, date: now.toISOString(), description: null, type: 'entry' },
        { id: 2, clientName: 'B', hours: 10, date: lastWeek.toISOString(), description: null, type: 'entry' },
      ];
      const result = calculateTrend(items);
      expect(result.direction).toBe('down');
      expect(result.percentage).toBe(80);
    });

    it('returns flat when this week and last week are equal', () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const items: ActivityItem[] = [
        { id: 1, clientName: 'A', hours: 5, date: now.toISOString(), description: null, type: 'entry' },
        { id: 2, clientName: 'B', hours: 5, date: lastWeek.toISOString(), description: null, type: 'entry' },
      ];
      const result = calculateTrend(items);
      expect(result.direction).toBe('flat');
      expect(result.percentage).toBe(0);
    });
  });

  describe('renderMarkdownDescription', () => {
    it('returns parsed markdown as HTML string', () => {
      const result = renderMarkdownDescription('hello **world**');
      expect(result).toBe('<p>hello **world**</p>');
    });
  });

  describe('ActivityFeed component', () => {
    const baseItems: ActivityItem[] = [
      { id: 1, clientName: 'Acme Corp', hours: 4, date: new Date().toISOString(), description: 'Task done', type: 'entry' },
      { id: 2, clientName: 'Beta Inc', hours: 2, date: new Date().toISOString(), description: null, type: 'update' },
      { id: 3, clientName: 'Gamma LLC', hours: 1, date: new Date().toISOString(), description: 'Removed entry', type: 'delete' },
    ];

    it('renders the default title "Activity Feed"', () => {
      render(<ActivityFeed items={baseItems} />);
      expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    });

    it('renders a custom title when provided', () => {
      render(<ActivityFeed items={baseItems} title="Recent Work" />);
      expect(screen.getByText('Recent Work')).toBeInTheDocument();
    });

    it('renders "No recent activity" when items is empty', () => {
      render(<ActivityFeed items={[]} />);
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });

    it('renders client names for each item', () => {
      render(<ActivityFeed items={baseItems} />);
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Beta Inc')).toBeInTheDocument();
      expect(screen.getByText('Gamma LLC')).toBeInTheDocument();
    });

    it('renders type labels: New, Updated, Deleted', () => {
      render(<ActivityFeed items={baseItems} />);
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Updated')).toBeInTheDocument();
      expect(screen.getByText('Deleted')).toBeInTheDocument();
    });

    it('renders markdown descriptions when present', () => {
      render(<ActivityFeed items={baseItems} />);
      expect(screen.getByText('Task done')).toBeInTheDocument();
      expect(screen.getByText('Removed entry')).toBeInTheDocument();
    });

    it('respects maxItems prop', () => {
      render(<ActivityFeed items={baseItems} maxItems={1} />);
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.queryByText('Beta Inc')).not.toBeInTheDocument();
    });

    it('shows trend chip when showTrend is true and trend is not flat', () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const trendItems: ActivityItem[] = [
        { id: 1, clientName: 'A', hours: 10, date: now.toISOString(), description: null, type: 'entry' },
        { id: 2, clientName: 'B', hours: 5, date: lastWeek.toISOString(), description: null, type: 'entry' },
      ];
      render(<ActivityFeed items={trendItems} showTrend={true} />);
      expect(screen.getByText('100% increase')).toBeInTheDocument();
    });

    it('shows decrease trend chip', () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const trendItems: ActivityItem[] = [
        { id: 1, clientName: 'A', hours: 2, date: now.toISOString(), description: null, type: 'entry' },
        { id: 2, clientName: 'B', hours: 10, date: lastWeek.toISOString(), description: null, type: 'entry' },
      ];
      render(<ActivityFeed items={trendItems} showTrend={true} />);
      expect(screen.getByText('80% decrease')).toBeInTheDocument();
    });

    it('does not show trend chip when showTrend is false', () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const trendItems: ActivityItem[] = [
        { id: 1, clientName: 'A', hours: 10, date: now.toISOString(), description: null, type: 'entry' },
        { id: 2, clientName: 'B', hours: 5, date: lastWeek.toISOString(), description: null, type: 'entry' },
      ];
      render(<ActivityFeed items={trendItems} showTrend={false} />);
      expect(screen.queryByText('100% increase')).not.toBeInTheDocument();
    });
  });
});
