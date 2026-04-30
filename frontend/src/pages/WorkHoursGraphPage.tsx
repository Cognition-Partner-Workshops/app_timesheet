import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
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
import { type HoursSummaryResponse, type HoursSummaryEntry } from '../types/api';

const formatXAxisLabel = (value: string, granularity: string): string => {
  if (granularity === 'daily') {
    const date = new Date(value + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (granularity === 'monthly') {
    const [year, month] = value.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return value;
};

const WorkHoursGraphPage: React.FC = () => {
  const [granularity, setGranularity] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [clientId, setClientId] = useState<number>(0);

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const { data: summaryData, isLoading } = useQuery<HoursSummaryResponse>({
    queryKey: ['hoursSummary', granularity, clientId],
    queryFn: () => apiClient.getHoursSummary(granularity, clientId || undefined),
  });

  const clients = clientsData?.clients || [];
  const entries: HoursSummaryEntry[] = summaryData?.data || [];

  const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);
  const avgHours = entries.length > 0 ? totalHours / entries.length : 0;

  const handleGranularityChange = (
    _event: React.MouseEvent<HTMLElement>,
    newGranularity: 'daily' | 'monthly' | 'yearly' | null,
  ) => {
    if (newGranularity) setGranularity(newGranularity);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Work Hours Graph
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" flexWrap="wrap" gap={3} alignItems="center">
          <ToggleButtonGroup
            value={granularity}
            exclusive
            onChange={handleGranularityChange}
            size="small"
          >
            <ToggleButton value="daily">Daily</ToggleButton>
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="yearly">Yearly</ToggleButton>
          </ToggleButtonGroup>

          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Filter by Client</InputLabel>
            <Select
              value={clientId}
              onChange={(e) => setClientId(Number(e.target.value))}
              label="Filter by Client"
            >
              <MenuItem value={0}>All Clients</MenuItem>
              {clients.map((c: { id: number; name: string }) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* @ts-expect-error - MUI Grid item prop type issue */}
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Hours
              </Typography>
              <Typography variant="h4">{totalHours.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* @ts-expect-error - MUI Grid item prop type issue */}
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average Hours per Period
              </Typography>
              <Typography variant="h4">{avgHours.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
            <CircularProgress />
          </Box>
        ) : entries.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
            <Typography color="text.secondary">
              No work hours data available for the selected period.
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={entries} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                tickFormatter={(value: string) => formatXAxisLabel(value, granularity)}
              />
              <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                labelFormatter={(label) => formatXAxisLabel(String(label), granularity)}
                formatter={(value) => [`${Number(value).toFixed(2)} hrs`, 'Hours']}
              />
              <Bar dataKey="totalHours" fill="#1976d2" name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>
    </Box>
  );
};

export default WorkHoursGraphPage;
