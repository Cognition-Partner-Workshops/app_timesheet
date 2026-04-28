import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from '../DashboardPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../api/client', () => ({
  default: {
    getClients: vi.fn().mockResolvedValue({
      clients: [
        { id: 1, name: 'Acme Corp', description: null, department: null, email: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 2, name: 'Globex Inc', description: null, department: null, email: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
      ],
    }),
    getWorkEntries: vi.fn().mockResolvedValue({
      workEntries: [
        { id: 1, client_id: 1, hours: 8, description: 'Dev work', date: '2024-01-15', created_at: '2024-01-15', updated_at: '2024-01-15', client_name: 'Acme Corp' },
        { id: 2, client_id: 2, hours: 4.5, description: 'Consulting', date: '2024-01-16', created_at: '2024-01-16', updated_at: '2024-01-16', client_name: 'Globex Inc' },
      ],
    }),
  },
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should navigate to /clients when Total Clients card is clicked', async () => {
    renderWithQueryClient(<DashboardPage />);

    const card = await screen.findByText('Total Clients');
    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('should navigate to /work-entries when Total Work Entries card is clicked', async () => {
    renderWithQueryClient(<DashboardPage />);

    const card = await screen.findByText('Total Work Entries');
    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledWith('/work-entries');
  });

  it('should navigate to /reports when Total Hours card is clicked', async () => {
    renderWithQueryClient(<DashboardPage />);

    const card = await screen.findByText('Total Hours');
    fireEvent.click(card);

    expect(mockNavigate).toHaveBeenCalledWith('/reports');
  });

  it('should render Dashboard heading', async () => {
    renderWithQueryClient(<DashboardPage />);

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('should display the correct total hours', async () => {
    renderWithQueryClient(<DashboardPage />);

    // 8 + 4.5 = 12.50
    expect(await screen.findByText('12.50')).toBeInTheDocument();
  });

  it('should display correct client and work entry counts', async () => {
    renderWithQueryClient(<DashboardPage />);

    // Wait for data to load by waiting for a known data element
    await screen.findByText('12.50');

    const totalClientsCard = screen.getByText('Total Clients');
    const clientValue = totalClientsCard.closest('.MuiCardContent-root')?.querySelector('.MuiTypography-h4');
    expect(clientValue).toHaveTextContent('2');

    const totalEntriesCard = screen.getByText('Total Work Entries');
    const entriesValue = totalEntriesCard.closest('.MuiCardContent-root')?.querySelector('.MuiTypography-h4');
    expect(entriesValue).toHaveTextContent('2');
  });

  it('should render recent work entries', async () => {
    renderWithQueryClient(<DashboardPage />);

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Globex Inc')).toBeInTheDocument();
    expect(screen.getByText(/8 hours/)).toBeInTheDocument();
    expect(screen.getByText(/4\.5 hours/)).toBeInTheDocument();
  });

  it('should render work entry descriptions', async () => {
    renderWithQueryClient(<DashboardPage />);

    expect(await screen.findByText('Dev work')).toBeInTheDocument();
    expect(screen.getByText('Consulting')).toBeInTheDocument();
  });

  it('should navigate to /clients when New Client quick action is clicked', async () => {
    renderWithQueryClient(<DashboardPage />);

    const button = await screen.findByRole('button', { name: /New Client/i });
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('should navigate to /work-entry when Log Time quick action is clicked', async () => {
    renderWithQueryClient(<DashboardPage />);

    const button = await screen.findByRole('button', { name: /Log Time/i });
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/work-entry');
  });

  it('should navigate to /reports when See Reports quick action is clicked', async () => {
    renderWithQueryClient(<DashboardPage />);

    const button = await screen.findByRole('button', { name: /See Reports/i });
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/reports');
  });

  it('should navigate to /work-entries when Add Entry button is clicked', async () => {
    renderWithQueryClient(<DashboardPage />);

    const button = await screen.findByRole('button', { name: /Add Entry/i });
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith('/work-entries');
  });

  it('should show empty state when no work entries exist', async () => {
    const apiClient = await import('../../api/client');
    vi.mocked(apiClient.default.getWorkEntries).mockResolvedValueOnce({ workEntries: [] });
    vi.mocked(apiClient.default.getClients).mockResolvedValueOnce({ clients: [] });

    renderWithQueryClient(<DashboardPage />);

    expect(await screen.findByText('No work entries yet')).toBeInTheDocument();
  });
});
