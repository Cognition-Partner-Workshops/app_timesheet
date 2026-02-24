const express = require('express');
const router = express.Router();
const {
  getSLOMetrics,
  getMetricsByEndpoint,
  getTimeSeriesMetrics,
  getSLOTargets,
} = require('../middleware/sloMetrics');
const { businessLogger } = require('../utils/logger');

// GET /api/slo/metrics - Get overall SLO metrics summary
router.get('/metrics', (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow) || 60; // Default 60 minutes
    const metrics = getSLOMetrics(timeWindow);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching SLO metrics:', error);
    res.status(500).json({ error: 'Failed to fetch SLO metrics' });
  }
});

// GET /api/slo/endpoints - Get metrics broken down by endpoint
router.get('/endpoints', (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow) || 60;
    const endpointMetrics = getMetricsByEndpoint(timeWindow);
    res.json({ endpoints: endpointMetrics });
  } catch (error) {
    console.error('Error fetching endpoint metrics:', error);
    res.status(500).json({ error: 'Failed to fetch endpoint metrics' });
  }
});

// GET /api/slo/timeseries - Get time series data for charts
router.get('/timeseries', (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow) || 60;
    const bucketSize = parseInt(req.query.bucketSize) || 5; // Default 5 minute buckets
    const timeSeries = getTimeSeriesMetrics(timeWindow, bucketSize);
    res.json({ timeSeries });
  } catch (error) {
    console.error('Error fetching time series metrics:', error);
    res.status(500).json({ error: 'Failed to fetch time series metrics' });
  }
});

// GET /api/slo/targets - Get SLO target configuration
router.get('/targets', (req, res) => {
  try {
    const targets = getSLOTargets();
    res.json({ targets });
  } catch (error) {
    console.error('Error fetching SLO targets:', error);
    res.status(500).json({ error: 'Failed to fetch SLO targets' });
  }
});

// GET /api/slo/matrix - Get quality gate matrix for multiple time windows
router.get('/matrix', (req, res) => {
  try {
    const timeWindows = [15, 60, 360, 1440]; // 15min, 1hr, 6hr, 24hr
    const matrix = timeWindows.map(window => {
      const metrics = getSLOMetrics(window);
      return {
        timeWindow: window,
        label: window === 15 ? 'Last 15m' : window === 60 ? 'Last 1h' : window === 360 ? 'Last 6h' : 'Last 24h',
        metrics: {
          responseTimeP95: {
            value: metrics.latency.p95.current,
            status: metrics.latency.p95.status,
          },
          responseTimeP50: {
            value: metrics.latency.p50.current,
            status: metrics.latency.p50.status,
          },
          errorRate: {
            value: metrics.errorRate.current,
            status: metrics.errorRate.status,
          },
          throughput: {
            value: metrics.throughput.requestsPerMinute,
            status: metrics.throughput.status,
          },
          availability: {
            value: metrics.availability.current,
            status: metrics.availability.status,
          },
        },
        qualityGates: metrics.qualityGates,
        totalRequests: metrics.totalRequests,
      };
    });
    
    // Calculate overall score for each time window
    const matrixWithScores = matrix.map(item => {
      const gates = item.qualityGates.gates;
      const passedCount = gates.filter(g => g.passed).length;
      const totalCount = gates.length;
      const overallScore = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 100;
      return {
        ...item,
        overallScore,
        overallStatus: overallScore >= 90 ? 'healthy' : overallScore >= 75 ? 'warning' : 'critical',
      };
    });
    
    // Get SLO targets with warning thresholds
    const targets = getSLOTargets();
    const sloTargets = {
      responseTimeP95: { pass: targets.latencyP95, warn: targets.latencyP95 * 2 },
      responseTimeP50: { pass: targets.latencyP50, warn: targets.latencyP50 * 2 },
      errorRate: { pass: targets.errorRate, warn: targets.errorRate * 5 },
      throughput: { pass: targets.throughputMin, warn: targets.throughputMin * 0.5 },
      availability: { pass: targets.availability, warn: 99.0 },
      overallScore: { pass: 90, warn: 75 },
    };
    
    res.json({
      matrix: matrixWithScores,
      targets: sloTargets,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching SLO matrix:', error);
    res.status(500).json({ error: 'Failed to fetch SLO matrix' });
  }
});

// GET /api/slo/quality-gates - Get quality gates status
router.get('/quality-gates', (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow) || 60;
    const metrics = getSLOMetrics(timeWindow);
    
    // Log quality gate status
    businessLogger.logQualityGatesChecked(
      metrics.qualityGates.passed,
      metrics.qualityGates.gates,
      req.correlationId
    );
    
    res.json({
      passed: metrics.qualityGates.passed,
      gates: metrics.qualityGates.gates,
      timestamp: metrics.timestamp,
      timeWindow,
    });
  } catch (error) {
    console.error('Error fetching quality gates:', error);
    res.status(500).json({ error: 'Failed to fetch quality gates' });
  }
});

module.exports = router;
