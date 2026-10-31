const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');

let server;
let baseUrl;

describe('Azure Microservice & Telemetry API Test Suite', () => {
  before(async () => {
    // Start server on an ephemeral port for testing
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  test('GET /healthz returns 200 and healthy status', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'healthy');
    assert.ok(typeof body.uptimeSeconds === 'number');
    assert.ok(body.timestamp);
  });

  test('GET /readyz returns 200 and ready status for Kubernetes', async () => {
    const res = await fetch(`${baseUrl}/readyz`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'ready');
    assert.strictEqual(body.checks.server, 'ok');
  });

  test('GET /metrics returns 200 with runtime memory statistics', async () => {
    const res = await fetch(`${baseUrl}/metrics`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.ok(body.memory);
    assert.ok(body.memory.heapUsedMb);
    assert.ok(typeof body.totalRequests === 'number');
  });

  test('GET /api/info returns Azure & Kubernetes runtime metadata', async () => {
    const res = await fetch(`${baseUrl}/api/info`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.application.name, 'Azure GitHub Runner Demo App');
    assert.strictEqual(body.infrastructure.cloudProvider, 'Microsoft Azure');
    assert.ok(Array.isArray(body.infrastructure.runnerLabels));
    assert.ok(body.infrastructure.runnerLabels.includes('self-hosted'));
  });

  test('GET /api/telemetry returns CPU and memory utilization', async () => {
    const res = await fetch(`${baseUrl}/api/telemetry`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'OPTIMAL');
    assert.ok(body.cpuCount >= 1);
    assert.ok(body.memoryUsagePercent);
  });

  test('POST /api/echo receives and echoes JSON payload', async () => {
    const payload = { testMessage: 'Echo Verification', testId: 42 };
    const res = await fetch(`${baseUrl}/api/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.receivedPayload.testMessage, 'Echo Verification');
    assert.strictEqual(body.receivedPayload.testId, 42);
  });

  test('GET /api/nonexistent returns 404 with error payload', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent`);
    assert.strictEqual(res.status, 404);

    const body = await res.json();
    assert.strictEqual(body.error, 'Endpoint Not Found');
  });

  test('GET / returns 200 and serves HTML web dashboard', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('Cloud-Native Telemetry Dashboard'));
    assert.ok(text.includes('Azure Infrastructure & CI/CD'));
  });
});
