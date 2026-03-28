import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityFeed, {
  formatRelativeDate,
  calculateTrend,
  renderMarkdownDescription,
  type ActivityItem,
} from '../ActivityFeed';

// Helper to create a date string N days ago
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makeItem(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: 1,
    clientName: 'Acme Corp',
    hours: 4,
    date: daysAgo(1),
    description: null,
    type: 'entry',
    ...overrides,
  };
}

describe('ActivityFeed', () => {
  // ─── formatRelativeDate ──────────────────────────────────────
  describe('formatRelativeDate', () => {
    it('returns "Today" for today\'s date', () => {
      expect(formatRelativeDate(new Date().toISOString())).toBe('Today');
    });

    it('returns "Yesterday" for 1 day ago', () => {
      expect(formatRelativeDate(daysAgo(1))).toBe('Yesterday');
    });

    it('returns "X days ago" for 2-6 days ago', () => {
      expect(formatRelativeDate(daysAgo(3))).toBe('3 days ago');
      expect(formatRelativeDate(daysAgo(6))).toBe('6 days ago');
    });

    it('returns "X weeks ago" for 7-29 days ago', () => {
      expect(formatRelativeDate(daysAgo(7))).toBe('1 weeks ago');
      expect(formatRelativeDate(daysAgo(14))).toBe('2 weeks ago');
      expect(formatRelativeDate(daysAgo(21))).toBe('3 weeks ago');
    });

    it('returns locale date string for 30+ days ago', () => {
      const d = new Date();
      d.setDate(d.getDate() - 45);
      const result = formatRelativeDate(d.toISOString());
      expect(result).not.toContain('weeks ago');
      expect(result).not.toContain('days ago');
    });
  });

  // ─── calculateTrend ──────────────────────────────────────────
  describe('calculateTrend', () => {
    it('returns flat with 0% for fewer than 2 items', () => {
      expect(calculateTrend([])).toEqual({ direction: 'flat', percentage: 0 });
      expect(calculateTrend([makeItem()])).toEqual({ direction: 'flat', percentage: 0 });
    });

    it('returns up trend when this week hours > last week hours', () => {
      const items: ActivityItem[] = [
        makeItem({ id: 1, hours: 10, date: daysAgo(1) }),
        makeItem({ id: 2, hours: 2, date: daysAgo(10) }),
      ];
      const trend = calculateTrend(items);
      expect(trend.direction).toBe('up');
      expect(trend.percentage).toBeGreaterThan(0);
    });

    it('returns down trend when this week hours < last week hours', () => {
      const items: ActivityItem[] = [
        makeItem({ id: 1, hours: 2, date: daysAgo(1) }),
        makeItem({ id: 2, hours: 10, date: daysAgo(10) }),
      ];
      const trend = calculateTrend(items);
      expect(trend.direction).toBe('down');
      expect(trend.percentage).toBeGreaterThan(0);
    });

    it('returns flat when both weeks have equal hours', () => {
      const items: ActivityItem[] = [
        makeItem({ id: 1, hours: 5, date: daysAgo(1) }),
        makeItem({ id: 2, hours: 5, date: daysAgo(10) }),
      ];
      const trend = calculateTrend(items);
      expect(trend.direction).toBe('flat');
      expect(trend.percentage).toBe(0);
    });

    it('handles zero lastWeek hours — returns up if thisWeek > 0', () => {
      const items: ActivityItem[] = [
        makeItem({ id: 1, hours: 5, date: daysAgo(0) }),
        makeItem({ id: 2, hours: 3, date: daysAgo(2) }),
      ];
      const trend = calculateTrend(items);
      expect(trend.direction).toBe('up');
      expect(trend.percentage).toBe(100);
    });

    it('handles zero lastWeek and zero thisWeek — returns flat', () => {
      const items: ActivityItem[] = [
        makeItem({ id: 1, hours: 5, date: daysAgo(20) }),
        makeItem({ id: 2, hours: 3, date: daysAgo(25) }),
      ];
      const trend = calculateTrend(items);
      expect(trend.direction).toBe('flat');
      expect(trend.percentage).toBe(100);
    });
  });

  // ─── renderMarkdownDescription ───────────────────────────────
  describe('renderMarkdownDescription', () => {
    it('renders bold markdown', () => {
      const html = renderMarkdownDescription('**bold text**');
      expect(html).toContain('<strong>bold text</strong>');
    });

    it('renders inline code', () => {
      const html = renderMarkdownDescription('use `npm install`');
      expect(html).toContain('<code>npm install</code>');
    });

    it('renders a link', () => {
      const html = renderMarkdownDescription('[link](http://example.com)');
      expect(html).toContain('href="http://example.com"');
    });

    it('sanitizes script tags from markdown output', () => {
      const html = renderMarkdownDescription('<script>alert("xss")</script>');
      expect(html).not.toContain('<script>');
    });
  });

  // ─── ActivityFeed component ──────────────────────────────────
  describe('component rendering', () => {
    it('renders the default title "Activity Feed"', () => {
      render(<ActivityFeed items={[]} />);
      expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    });

    it('renders a custom title', () => {
      render(<ActivityFeed items={[]} title="Recent Work" />);
      expect(screen.getByText('Recent Work')).toBeInTheDocument();
    });

    it('shows empty state when no items', () => {
      render(<ActivityFeed items={[]} />);
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });

    it('renders activity items with client name and type chip', () => {
      const items: ActivityItem[] = [
        makeItem({ id: 1, clientName: 'Acme Corp', hours: 8, date: daysAgo(0), type: 'entry' }),
      ];
      render(<ActivityFeed items={items} />);
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('renders type chips correctly for all types', () => {
      const items: ActivityItem[] = [
        makeItem({ id: 1, type: 'entry', clientName: 'A' }),
        makeItem({ id: 2, type: 'update', clientName: 'B' }),
        makeItem({ id: 3, type: 'delete', clientName: 'C' }),
      ];
      render(<ActivityFeed items={items} />);
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Updated')).toBeInTheDocument();
      expect(screen.getByText('Deleted')).toBeInTheDocument();
    });

    it('respects maxItems prop', () => {
      const items: ActivityItem[] = Array.from({ length: 5 }, (_, i) =>
        makeItem({ id: i + 1, clientName: `Client ${i + 1}` })
      );
      render(<ActivityFeed items={items} maxItems={2} />);
      expect(screen.getByText('Client 1')).toBeInTheDocument();
      expect(screen.getByText('Client 2')).toBeInTheDocument();
      expect(screen.queryByText('Client 3')).not.toBeInTheDocument();
    });

    it('renders markdown description when present', () => {
      const items: ActivityItem[] = [
        makeItem({ id: 1, description: '**important** work' }),
      ];
      render(<ActivityFeed items={items} />);
      const strong = document.querySelector('strong');
      expect(strong).not.toBeNull();
      expect(strong!.textContent).toBe('important');
    });

    it('shows trend chip when showTrend is true and trend is not flat', () => {
      const items: ActivityItem[] = [
        makeItem({ id: 1, hours: 10, date: daysAgo(1) }),
        makeItem({ id: 2, hours: 2, date: daysAgo(10) }),
      ];
      render(<ActivityFeed items={items} showTrend={true} />);
      expect(screen.getByText(/increase/)).toBeInTheDocument();
    });

    it('shows decrease chip for down trend', () => {
      const items: ActivityItem[] = [
        makeItem({ id: 1, hours: 2, date: daysAgo(1) }),
        makeItem({ id: 2, hours: 10, date: daysAgo(10) }),
      ];
      render(<ActivityFeed items={items} showTrend={true} />);
      expect(screen.getByText(/decrease/)).toBeInTheDocument();
    });

    it('hides trend chip when showTrend is false', () => {
      const items: ActivityItem[] = [
        makeItem({ id: 1, hours: 10, date: daysAgo(1) }),
        makeItem({ id: 2, hours: 2, date: daysAgo(10) }),
      ];
      render(<ActivityFeed items={items} showTrend={false} />);
      expect(screen.queryByText(/increase/)).not.toBeInTheDocument();
    });

    it('does not render description box when description is null', () => {
      const items: ActivityItem[] = [
        makeItem({ id: 1, description: null }),
      ];
      render(<ActivityFeed items={items} />);
      expect(document.querySelector('strong')).toBeNull();
    });
  });
});
