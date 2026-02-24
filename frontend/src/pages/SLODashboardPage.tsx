import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  RocketLaunch as RocketLaunchIcon,
  Block as BlockIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

interface SLOMetric {
  current: number;
  target: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface LatencyMetrics {
  p50: SLOMetric;
  p95: SLOMetric;
  p99: SLOMetric;
  average: number;
}

interface QualityGate {
  name: string;
  passed: boolean;
  current: string;
  target: number;
  unit: string;
}

interface SLOMetricsData {
  timeWindow: number;
  totalRequests: number;
  availability: SLOMetric & { successCount: number; failureCount: number };
  latency: LatencyMetrics;
  errorRate: SLOMetric & { errorCount: number };
  throughput: SLOMetric & { requestsPerMinute: number };
  qualityGates: {
    passed: boolean;
    gates: QualityGate[];
  };
  timestamp: string;
}

interface EndpointMetric {
  endpoint: string;
  totalRequests: number;
  errorRate: number;
  avgLatency: number;
  p95Latency: number;
}

const getStatusColor = (status: string): 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'healthy':
      return 'success';
    case 'warning':
      return 'warning';
    case 'critical':
      return 'error';
    default:
      return 'success';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy':
      return <CheckCircleIcon color="success" />;
    case 'warning':
      return <WarningIcon color="warning" />;
    case 'critical':
      return <ErrorIcon color="error" />;
    default:
      return <CheckCircleIcon color="success" />;
  }
};

const MetricCard: React.FC<{
  title: string;
  current: number | string;
  target: number;
  unit: string;
  status: string;
  icon: React.ReactNode;
  subtitle?: string;
}> = ({ title, current, target, unit, status, icon, subtitle }) => {
  const progress = typeof current === 'number' ? Math.min((current / target) * 100, 100) : 0;
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            {icon}
            <Typography variant="h6" component="div">
              {title}
            </Typography>
          </Box>
          {getStatusIcon(status)}
        </Box>
        <Typography variant="h3" component="div" color={getStatusColor(status)}>
          {current}{unit}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Target: {target}{unit}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={getStatusColor(status)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

const GoNoGoDecisionPanel: React.FC<{
  metrics: SLOMetricsData;
  timeWindow: number;
}> = ({ metrics, timeWindow }) => {
  const allGatesPassed = metrics.qualityGates.passed;
  const failedGates = metrics.qualityGates.gates.filter(g => !g.passed);
  const passedGates = metrics.qualityGates.gates.filter(g => g.passed);
  
  // Calculate deployment readiness score (percentage of gates passed)
  const readinessScore = metrics.qualityGates.gates.length > 0
    ? Math.round((passedGates.length / metrics.qualityGates.gates.length) * 100)
    : 100;
  
  // Determine if there's enough data for a reliable decision
  const hasEnoughData = metrics.totalRequests >= 10;
  
  // Decision logic
  const decision = !hasEnoughData ? 'INSUFFICIENT_DATA' : allGatesPassed ? 'GO' : 'NO_GO';
  
  const getDecisionColor = () => {
    switch (decision) {
      case 'GO': return 'success';
      case 'NO_GO': return 'error';
      default: return 'warning';
    }
  };
  
  const getDecisionBgColor = () => {
    switch (decision) {
      case 'GO': return 'success.light';
      case 'NO_GO': return 'error.light';
      default: return 'warning.light';
    }
  };
  
  const getDecisionTextColor = () => {
    switch (decision) {
      case 'GO': return 'success.dark';
      case 'NO_GO': return 'error.dark';
      default: return 'warning.dark';
    }
  };

  return (
    <Card sx={{ mb: 3, border: 2, borderColor: `${getDecisionColor()}.main` }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <AssessmentIcon sx={{ fontSize: 32 }} color={getDecisionColor()} />
            <Typography variant="h5" fontWeight="bold">
              Deployment Readiness Assessment
            </Typography>
          </Box>
          <Chip
            label={`${readinessScore}% Ready`}
            color={getDecisionColor()}
            size="medium"
            sx={{ fontWeight: 'bold', fontSize: '1rem', py: 2 }}
          />
        </Box>

        {/* Main Decision Banner */}
        <Paper 
          sx={{ 
            p: 3, 
            mb: 3, 
            bgcolor: getDecisionBgColor(),
            textAlign: 'center',
            borderRadius: 2,
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
            {decision === 'GO' ? (
              <RocketLaunchIcon sx={{ fontSize: 48, color: getDecisionTextColor() }} />
            ) : decision === 'NO_GO' ? (
              <BlockIcon sx={{ fontSize: 48, color: getDecisionTextColor() }} />
            ) : (
              <WarningIcon sx={{ fontSize: 48, color: getDecisionTextColor() }} />
            )}
            <Box>
              <Typography variant="h3" fontWeight="bold" color={getDecisionTextColor()}>
                {decision === 'GO' ? 'GO' : decision === 'NO_GO' ? 'NO-GO' : 'WAIT'}
              </Typography>
              <Typography variant="h6" color={getDecisionTextColor()}>
                {decision === 'GO' 
                  ? 'All quality gates passed - Safe to deploy'
                  : decision === 'NO_GO'
                  ? `${failedGates.length} quality gate(s) failed - Do not deploy`
                  : 'Insufficient data - Need more traffic for reliable decision'}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Metrics Summary Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="h4" color={getStatusColor(metrics.availability.status)}>
                {metrics.availability.current}%
              </Typography>
              <Typography variant="body2" color="text.secondary">Availability</Typography>
              <Typography variant="caption" color="text.secondary">
                Target: {metrics.availability.target}%
              </Typography>
            </Paper>
          </Grid>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="h4" color={getStatusColor(metrics.latency.p95.status)}>
                {metrics.latency.p95.current}ms
              </Typography>
              <Typography variant="body2" color="text.secondary">P95 Latency</Typography>
              <Typography variant="caption" color="text.secondary">
                Target: {metrics.latency.p95.target}ms
              </Typography>
            </Paper>
          </Grid>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="h4" color={getStatusColor(metrics.errorRate.status)}>
                {metrics.errorRate.current}%
              </Typography>
              <Typography variant="body2" color="text.secondary">Error Rate</Typography>
              <Typography variant="caption" color="text.secondary">
                Target: &lt;{metrics.errorRate.target}%
              </Typography>
            </Paper>
          </Grid>
          {/* @ts-expect-error - MUI Grid item prop type issue */}
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="h4" color={getStatusColor(metrics.throughput.status)}>
                {metrics.throughput.requestsPerMinute}
              </Typography>
              <Typography variant="body2" color="text.secondary">Throughput (req/min)</Typography>
              <Typography variant="caption" color="text.secondary">
                Target: &gt;{metrics.throughput.target}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Quality Gates Status */}
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            Quality Gates Status ({passedGates.length}/{metrics.qualityGates.gates.length} Passed)
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {metrics.qualityGates.gates.map((gate) => (
              <Chip
                key={gate.name}
                icon={gate.passed ? <CheckCircleIcon /> : <ErrorIcon />}
                label={`${gate.name}: ${gate.current}${gate.unit}`}
                color={gate.passed ? 'success' : 'error'}
                variant={gate.passed ? 'outlined' : 'filled'}
              />
            ))}
          </Box>
        </Box>

        {/* Additional Info */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            Analysis based on {metrics.totalRequests} requests over the last {timeWindow} minutes | 
            Last updated: {new Date(metrics.timestamp).toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

const QualityGatesCard: React.FC<{ gates: QualityGate[]; passed: boolean }> = ({ gates, passed }) => {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <SecurityIcon color={passed ? 'success' : 'error'} />
            <Typography variant="h6">Quality Gates</Typography>
          </Box>
          <Chip
            label={passed ? 'All Passed' : 'Failed'}
            color={passed ? 'success' : 'error'}
            size="small"
          />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Gate</TableCell>
                <TableCell align="right">Current</TableCell>
                <TableCell align="right">Target</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gates.map((gate) => (
                <TableRow key={gate.name}>
                  <TableCell>{gate.name}</TableCell>
                  <TableCell align="right">{gate.current}{gate.unit}</TableCell>
                  <TableCell align="right">{gate.target}{gate.unit}</TableCell>
                  <TableCell align="center">
                    {gate.passed ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <ErrorIcon color="error" fontSize="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

const EndpointMetricsTable: React.FC<{ endpoints: EndpointMetric[] }> = ({ endpoints }) => {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <TimelineIcon color="primary" />
          <Typography variant="h6">Endpoint Metrics</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Endpoint</TableCell>
                <TableCell align="right">Requests</TableCell>
                <TableCell align="right">Error Rate</TableCell>
                <TableCell align="right">Avg Latency</TableCell>
                <TableCell align="right">P95 Latency</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {endpoints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">No endpoint data available</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                endpoints.map((endpoint) => (
                  <TableRow key={endpoint.endpoint}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {endpoint.endpoint}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{endpoint.totalRequests}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${endpoint.errorRate}%`}
                        size="small"
                        color={endpoint.errorRate > 5 ? 'error' : endpoint.errorRate > 1 ? 'warning' : 'success'}
                      />
                    </TableCell>
                    <TableCell align="right">{endpoint.avgLatency}ms</TableCell>
                    <TableCell align="right">{endpoint.p95Latency}ms</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

const SLODashboardPage: React.FC = () => {
  const [timeWindow, setTimeWindow] = useState<number>(60);

  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery<SLOMetricsData>({
    queryKey: ['sloMetrics', timeWindow],
    queryFn: () => apiClient.getSLOMetrics(timeWindow),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: endpointsData, isLoading: endpointsLoading } = useQuery<{ endpoints: EndpointMetric[] }>({
    queryKey: ['sloEndpoints', timeWindow],
    queryFn: () => apiClient.getSLOEndpointMetrics(timeWindow),
    refetchInterval: 30000,
  });

  if (metricsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (metricsError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load SLO metrics. Please try again later.
      </Alert>
    );
  }

  const metrics = metricsData;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">SLO Dashboard</Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Time Window</InputLabel>
          <Select
            value={timeWindow}
            label="Time Window"
            onChange={(e) => setTimeWindow(Number(e.target.value))}
          >
            <MenuItem value={15}>Last 15 min</MenuItem>
            <MenuItem value={30}>Last 30 min</MenuItem>
            <MenuItem value={60}>Last 1 hour</MenuItem>
            <MenuItem value={180}>Last 3 hours</MenuItem>
            <MenuItem value={360}>Last 6 hours</MenuItem>
            <MenuItem value={720}>Last 12 hours</MenuItem>
            <MenuItem value={1440}>Last 24 hours</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {metrics && (
        <>
          {/* Go/No-Go Decision Panel for Deployment Engineers */}
          <GoNoGoDecisionPanel metrics={metrics} timeWindow={timeWindow} />

          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* @ts-expect-error - MUI Grid item prop type issue */}
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Availability"
                current={metrics.availability.current}
                target={metrics.availability.target}
                unit="%"
                status={metrics.availability.status}
                icon={<CheckCircleIcon color="primary" />}
                subtitle={`${metrics.availability.successCount} success / ${metrics.availability.failureCount} failures`}
              />
            </Grid>
            {/* @ts-expect-error - MUI Grid item prop type issue */}
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Latency (P95)"
                current={metrics.latency.p95.current}
                target={metrics.latency.p95.target}
                unit="ms"
                status={metrics.latency.p95.status}
                icon={<SpeedIcon color="primary" />}
                subtitle={`P50: ${metrics.latency.p50.current}ms | P99: ${metrics.latency.p99.current}ms`}
              />
            </Grid>
            {/* @ts-expect-error - MUI Grid item prop type issue */}
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Error Rate"
                current={metrics.errorRate.current}
                target={metrics.errorRate.target}
                unit="%"
                status={metrics.errorRate.status}
                icon={<ErrorIcon color="primary" />}
                subtitle={`${metrics.errorRate.errorCount} errors total`}
              />
            </Grid>
            {/* @ts-expect-error - MUI Grid item prop type issue */}
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Throughput"
                current={metrics.throughput.requestsPerMinute}
                target={metrics.throughput.target}
                unit=" req/min"
                status={metrics.throughput.status}
                icon={<TrendingUpIcon color="primary" />}
              />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            {/* @ts-expect-error - MUI Grid item prop type issue */}
            <Grid item xs={12} md={6}>
              <QualityGatesCard
                gates={metrics.qualityGates.gates}
                passed={metrics.qualityGates.passed}
              />
            </Grid>
            {/* @ts-expect-error - MUI Grid item prop type issue */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <SpeedIcon color="primary" />
                    <Typography variant="h6">Latency Distribution</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {/* @ts-expect-error - MUI Grid item prop type issue */}
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <Typography variant="h4" color={getStatusColor(metrics.latency.p50.status)}>
                          {metrics.latency.p50.current}ms
                        </Typography>
                        <Typography variant="body2" color="text.secondary">P50</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Target: {metrics.latency.p50.target}ms
                        </Typography>
                      </Box>
                    </Grid>
                    {/* @ts-expect-error - MUI Grid item prop type issue */}
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <Typography variant="h4" color={getStatusColor(metrics.latency.p95.status)}>
                          {metrics.latency.p95.current}ms
                        </Typography>
                        <Typography variant="body2" color="text.secondary">P95</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Target: {metrics.latency.p95.target}ms
                        </Typography>
                      </Box>
                    </Grid>
                    {/* @ts-expect-error - MUI Grid item prop type issue */}
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <Typography variant="h4" color={getStatusColor(metrics.latency.p99.status)}>
                          {metrics.latency.p99.current}ms
                        </Typography>
                        <Typography variant="body2" color="text.secondary">P99</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Target: {metrics.latency.p99.target}ms
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      Average Latency: {metrics.latency.average}ms
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            {endpointsLoading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <EndpointMetricsTable endpoints={endpointsData?.endpoints || []} />
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default SLODashboardPage;
