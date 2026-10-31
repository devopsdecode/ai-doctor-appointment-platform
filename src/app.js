const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('./routes/api');

const app = express();

// Security Headers with relaxed CSP for inline scripts/styles in dashboard
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"]
      }
    }
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Mount API routes (both at root for health checks and under /api)
app.use('/', apiRoutes);

// 404 Handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint Not Found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('[Error] Unhandled request error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
