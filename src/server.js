const app = require('./app');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log('================================================================');
  console.log(`🩺 PulseAI Doctor Appointment Platform started on http://${HOST}:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🏥 Health check: http://${HOST}:${PORT}/healthz`);
  console.log(`📊 Metrics:      http://${HOST}:${PORT}/metrics`);
  console.log(`ℹ️  Info:         http://${HOST}:${PORT}/api/info`);
  console.log('================================================================');
});

// Graceful Shutdown Handling (Essential for Kubernetes Pod Termination)
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log('HTTP server closed successfully. Process exiting.');
    process.exit(0);
  });

  // Force close after 10 seconds if connections refuse to terminate
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully terminating.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
