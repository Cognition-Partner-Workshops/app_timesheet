import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

interface MetricValue {
  value: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface MatrixItem {
  timeWindow: number;
  label: string;
  metrics: {
    responseTimeP95: MetricValue;
    responseTimeP50: MetricValue;
    errorRate: MetricValue;
    throughput: MetricValue;
    availability: MetricValue;
  };
  qualityGates: {
    passed: boolean;
    gates: Array<{
      name: string;
      passed: boolean;
      current: string;
      target: number;
      unit: string;
    }>;
  };
  totalRequests: number;
  overallScore: number;
  overallStatus: 'healthy' | 'warning' | 'critical';
}

interface SLOTargets {
  responseTimeP95: { pass: number; warn: number };
  responseTimeP50: { pass: number; warn: number };
  errorRate: { pass: number; warn: number };
  throughput: { pass: number; warn: number };
  availability: { pass: number; warn: number };
  overallScore: { pass: number; warn: number };
}

interface MatrixData {
  matrix: MatrixItem[];
  targets: SLOTargets;
  timestamp: string;
}

const getStatusBgColor = (status: 'healthy' | 'warning' | 'critical'): string => {
  switch (status) {
    case 'healthy':
      return '#4caf50';
    case 'warning':
      return '#ff9800';
    case 'critical':
      return '#f44336';
    default:
      return '#4caf50';
  }
};

const MetricCell: React.FC<{ value: number | string; status: 'healthy' | 'warning' | 'critical'; unit?: string }> = ({
  value,
  status,
  unit = '',
}) => {
  return (
    <TableCell
      align="center"
      sx={{
        backgroundColor: getStatusBgColor(status),
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1rem',
        border: '1px solid #e0e0e0',
        padding: '12px 16px',
      }}
    >
      {value}{unit}
    </TableCell>
  );
};

const SLOTargetCell: React.FC<{ pass: number; warn: number; unit?: string; isLowerBetter?: boolean }> = ({
  pass,
  warn,
  unit = '',
  isLowerBetter = true,
}) => {
  return (
    <TableCell
      align="center"
      sx={{
        backgroundColor: '#9c27b0',
        color: 'white',
        border: '1px solid #e0e0e0',
        padding: '8px',
        minWidth: '120px',
      }}
    >
      <Box>
        <Box sx={{ backgroundColor: '#4caf50', borderRadius: 1, px: 1, py: 0.5, mb: 0.5 }}>
          <Typography variant="body2" fontWeight="bold">
            {isLowerBetter ? '<' : '>'} {pass}{unit}
          </Typography>
        </Box>
        <Box sx={{ backgroundColor: '#ff9800', borderRadius: 1, px: 1, py: 0.5 }}>
          <Typography variant="body2" fontWeight="bold">
            {isLowerBetter ? '<' : '>'} {warn}{unit}
          </Typography>
        </Box>
      </Box>
    </TableCell>
  );
};

const OverallScoreCell: React.FC<{ score: number; status: 'healthy' | 'warning' | 'critical' }> = ({ score, status }) => {
  return (
    <TableCell
      align="center"
      sx={{
        backgroundColor: getStatusBgColor(status),
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1.1rem',
        border: '1px solid #e0e0e0',
        padding: '12px 16px',
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
        {status === 'healthy' ? (
          <CheckCircleIcon fontSize="small" />
        ) : (
          <CancelIcon fontSize="small" />
        )}
        {score}%
      </Box>
    </TableCell>
  );
};

const SLODashboardPage: React.FC = () => {
  const { data: matrixData, isLoading, error } = useQuery<MatrixData>({
    queryKey: ['sloMatrix'],
    queryFn: () => apiClient.getSLOMatrix(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load SLO metrics. Please try again later.
      </Alert>
    );
  }

  const matrix = matrixData?.matrix || [];
  const targets = matrixData?.targets;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Service Level Indicators (SLIs)
      </Typography>

      <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: '#1565c0',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  border: '1px solid #e0e0e0',
                  width: '250px',
                }}
              >
                Service Level Indicators (SLIs)
              </TableCell>
              <TableCell
                align="center"
                sx={{
                  backgroundColor: '#9c27b0',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  border: '1px solid #e0e0e0',
                }}
              >
                SLO
              </TableCell>
              {matrix.map((item) => (
                <TableCell
                  key={item.timeWindow}
                  align="center"
                  sx={{
                    backgroundColor: '#4caf50',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  {item.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Response Time P95 Row */}
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: '#1565c0',
                  color: 'white',
                  border: '1px solid #e0e0e0',
                }}
              >
                <Typography fontWeight="bold">Response Time 95th Percentile</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  95% of requests complete within this time
                </Typography>
              </TableCell>
              {targets && (
                <SLOTargetCell pass={targets.responseTimeP95.pass} warn={targets.responseTimeP95.warn} unit="ms" />
              )}
              {matrix.map((item) => (
                <MetricCell
                  key={item.timeWindow}
                  value={item.metrics.responseTimeP95.value}
                  status={item.metrics.responseTimeP95.status}
                  unit="ms"
                />
              ))}
            </TableRow>

            {/* Response Time P50 Row */}
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: '#1565c0',
                  color: 'white',
                  border: '1px solid #e0e0e0',
                }}
              >
                <Typography fontWeight="bold">Response Time 50th Percentile</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Median response time
                </Typography>
              </TableCell>
              {targets && (
                <SLOTargetCell pass={targets.responseTimeP50.pass} warn={targets.responseTimeP50.warn} unit="ms" />
              )}
              {matrix.map((item) => (
                <MetricCell
                  key={item.timeWindow}
                  value={item.metrics.responseTimeP50.value}
                  status={item.metrics.responseTimeP50.status}
                  unit="ms"
                />
              ))}
            </TableRow>

            {/* Error Rate Row */}
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: '#1565c0',
                  color: 'white',
                  border: '1px solid #e0e0e0',
                }}
              >
                <Typography fontWeight="bold">Error Rate</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Percentage of failed requests
                </Typography>
              </TableCell>
              {targets && (
                <SLOTargetCell pass={targets.errorRate.pass} warn={targets.errorRate.warn} unit="%" />
              )}
              {matrix.map((item) => (
                <MetricCell
                  key={item.timeWindow}
                  value={item.metrics.errorRate.value}
                  status={item.metrics.errorRate.status}
                  unit="%"
                />
              ))}
            </TableRow>

            {/* Throughput Row */}
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: '#1565c0',
                  color: 'white',
                  border: '1px solid #e0e0e0',
                }}
              >
                <Typography fontWeight="bold">Throughput</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Requests per minute
                </Typography>
              </TableCell>
              {targets && (
                <SLOTargetCell
                  pass={targets.throughput.pass}
                  warn={targets.throughput.warn}
                  unit=""
                  isLowerBetter={false}
                />
              )}
              {matrix.map((item) => (
                <MetricCell
                  key={item.timeWindow}
                  value={item.metrics.throughput.value.toFixed(1)}
                  status={item.metrics.throughput.status}
                />
              ))}
            </TableRow>

            {/* Overall Score Row */}
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: '#9c27b0',
                  color: 'white',
                  border: '1px solid #e0e0e0',
                }}
              >
                <Typography fontWeight="bold">SLO: Overall Score Goal</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Percentage of quality gates passed
                </Typography>
              </TableCell>
              {targets && (
                <TableCell
                  align="center"
                  sx={{
                    backgroundColor: '#9c27b0',
                    color: 'white',
                    border: '1px solid #e0e0e0',
                    padding: '8px',
                  }}
                >
                  <Box>
                    <Box sx={{ backgroundColor: '#4caf50', borderRadius: 1, px: 1, py: 0.5, mb: 0.5 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {'>='} {targets.overallScore.pass}%
                      </Typography>
                    </Box>
                    <Box sx={{ backgroundColor: '#ff9800', borderRadius: 1, px: 1, py: 0.5 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {'>='} {targets.overallScore.warn}%
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
              )}
              {matrix.map((item) => (
                <OverallScoreCell
                  key={item.timeWindow}
                  score={item.overallScore}
                  status={item.overallStatus}
                />
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Legend */}
      <Box sx={{ mt: 3, display: 'flex', gap: 3, alignItems: 'center' }}>
        <Typography variant="body2" fontWeight="bold">Legend:</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#4caf50', borderRadius: 1 }} />
          <Typography variant="body2">Pass (Meeting SLO)</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#ff9800', borderRadius: 1 }} />
          <Typography variant="body2">Warning (Below Target)</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#f44336', borderRadius: 1 }} />
          <Typography variant="body2">Fail (Critical)</Typography>
        </Box>
      </Box>

      {/* Last Updated */}
      {matrixData && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Last updated: {new Date(matrixData.timestamp).toLocaleString()} | Auto-refresh every 30 seconds
        </Typography>
      )}
    </Box>
  );
};

export default SLODashboardPage;
