import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Paper,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import apiClient from '../api/client';
import { type HoursSummaryEntry } from '../types/api';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const { data: workEntriesData } = useQuery({
    queryKey: ['workEntries'],
    queryFn: () => apiClient.getWorkEntries(),
  });

  const clients = clientsData?.clients || [];
  const workEntries = workEntriesData?.workEntries || [];

  const { data: hoursSummaryData } = useQuery({
    queryKey: ['hoursSummary', 'daily'],
    queryFn: () => apiClient.getHoursSummary('daily'),
  });

  const dailyEntries: HoursSummaryEntry[] = (hoursSummaryData?.data || []).slice(-7);

  const totalHours = workEntries.reduce((sum: number, entry: { hours: number }) => sum + entry.hours, 0);
  const recentEntries = workEntries.slice(0, 5);

  const statsCards = [
    {
      title: 'Total Clients',
      value: clients.length,
      icon: <BusinessIcon />,
      color: '#1976d2',
      action: () => navigate('/clients'),
    },
    {
      title: 'Total Work Entries',
      value: workEntries.length,
      icon: <AssignmentIcon />,
      color: '#388e3c',
      action: () => navigate('/work-entries'),
    },
    {
      title: 'Total Hours',
      value: totalHours.toFixed(2),
      icon: <AssessmentIcon />,
      color: '#f57c00',
      action: () => navigate('/reports'),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          // @ts-expect-error - MUI Grid item prop type issue
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={stat.action}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" gap={3}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="h6">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: stat.color,
                      borderRadius: 1,
                      p: 1,
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Last 7 Days</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<BarChartIcon />}
            onClick={() => navigate('/graphs')}
          >
            View Full Graph
          </Button>
        </Box>
        {dailyEntries.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyEntries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                tickFormatter={(v: string) => {
                  const d = new Date(v + 'T00:00:00');
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(label) => {
                  const d = new Date(String(label) + 'T00:00:00');
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
                formatter={(value) => [`${Number(value).toFixed(2)} hrs`, 'Hours']}
              />
              <Bar dataKey="totalHours" fill="#1976d2" name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={220}>
            <Typography color="text.secondary">No recent hours data</Typography>
          </Box>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* @ts-expect-error - MUI Grid item prop type issue */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={3}>
              <Typography variant="h6">Recent Work Entries</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => navigate('/work-entries')}
                sx={{ flexShrink: 0 }}
              >
                Add Entry
              </Button>
            </Box>
            {recentEntries.length > 0 ? (
              recentEntries.map((entry: { id: number; client_name: string; hours: number; date: string; description?: string }) => (
                <Box key={entry.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                  <Typography variant="subtitle1">{entry.client_name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {entry.hours} hours - {new Date(entry.date).toLocaleDateString()}
                  </Typography>
                  {entry.description && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {entry.description}
                    </Typography>
                  )}
                </Box>
              ))
            ) : (
              <Typography color="text.secondary">No work entries yet</Typography>
            )}
          </Paper>
        </Grid>

        {/* @ts-expect-error - MUI Grid item prop type issue */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" mb={2}>
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/clients')}
                fullWidth
              >
                Add Client
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/work-entries')}
                fullWidth
              >
                Add Work Entry
              </Button>
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                onClick={() => navigate('/reports')}
                fullWidth
              >
                View Reports
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
