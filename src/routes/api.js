const express = require('express');
const os = require('os');

const router = express.Router();
const startTime = Date.now();
let requestCounter = 0;

// Request counter middleware for basic metrics
router.use((req, res, next) => {
  requestCounter++;
  next();
});

/**
 * Kubernetes Liveness Probe: /healthz
 */
router.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000)
  });
});

/**
 * Kubernetes Readiness Probe: /readyz
 */
router.get('/readyz', (req, res) => {
  // Check if process has excessive memory pressure
  const mem = process.memoryUsage();
  const isOverloaded = mem.heapUsed > 1024 * 1024 * 1024; // > 1GB

  if (isOverloaded) {
    return res.status(503).json({
      status: 'unready',
      reason: 'Memory pressure exceeds threshold'
    });
  }

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      server: 'ok',
      memory: 'ok',
      storage: 'ok'
    }
  });
});

/**
 * Application & System Metrics: /metrics
 */
router.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  res.status(200).json({
    uptime: Math.floor((Date.now() - startTime) / 1000),
    totalRequests: requestCounter,
    memory: {
      rssMb: (mem.rss / (1024 * 1024)).toFixed(2),
      heapTotalMb: (mem.heapTotal / (1024 * 1024)).toFixed(2),
      heapUsedMb: (mem.heapUsed / (1024 * 1024)).toFixed(2),
      externalMb: (mem.external / (1024 * 1024)).toFixed(2)
    },
    system: {
      loadAverage: os.loadavg(),
      freeMemoryMb: (os.freemem() / (1024 * 1024)).toFixed(2),
      totalMemoryMb: (os.totalmem() / (1024 * 1024)).toFixed(2)
    }
  });
});

/**
 * Detailed Deployment & Cluster Info: /api/info
 */
router.get('/api/info', (req, res) => {
  res.status(200).json({
    application: {
      name: 'Azure GitHub Runner Demo App',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      framework: 'Express on Node.js'
    },
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      pid: process.pid,
      uptime: `${Math.floor((Date.now() - startTime) / 1000)}s`
    },
    infrastructure: {
      hostname: os.hostname(),
      cloudProvider: 'Microsoft Azure',
      ciRunner: 'Terraform-Provisioned GitHub Self-Hosted Runner VM',
      runnerLabels: ['self-hosted', 'linux', 'azure', 'docker']
    },
    kubernetes: {
      podName: process.env.POD_NAME || 'local-standalone-pod',
      podNamespace: process.env.POD_NAMESPACE || 'default',
      podIP: process.env.POD_IP || '127.0.0.1',
      nodeName: process.env.NODE_NAME || 'aks-nodepool1-vmss',
      clusterContext: process.env.K8S_CLUSTER_CONTEXT || 'aks-private-cluster'
    }
  });
});

/**
 * Real-time Telemetry for Frontend: /api/telemetry
 */
router.get('/api/telemetry', (req, res) => {
  const cpus = os.cpus();
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPercent = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);

  res.status(200).json({
    timestamp: new Date().toLocaleTimeString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    requestCount: requestCounter,
    cpuCount: cpus.length,
    cpuModel: cpus[0] ? cpus[0].model : 'Generic CPU',
    memoryUsagePercent: usedMemPercent,
    heapUsedMb: (mem.heapUsed / (1024 * 1024)).toFixed(1),
    heapTotalMb: (mem.heapTotal / (1024 * 1024)).toFixed(1),
    status: 'OPTIMAL'
  });
});

/**
 * Interactive API Test endpoint: /api/echo
 */
router.post('/api/echo', (req, res) => {
  res.status(200).json({
    message: 'Echo response received successfully from Azure Kubernetes cluster',
    receivedPayload: req.body || {},
    headersReceived: {
      host: req.headers.host,
      userAgent: req.headers['user-agent']
    },
    processedAt: new Date().toISOString()
  });
});

module.exports = router;
