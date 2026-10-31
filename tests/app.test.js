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

  test('GET /api/doctors returns doctor directory', async () => {
    const res = await fetch(`${baseUrl}/api/doctors`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.doctors));
    assert.ok(body.doctors.length >= 4);
    assert.ok(body.doctors[0].department);
    assert.ok(body.doctors[0].slots.length > 0);
  });

  test('POST /api/ai/diagnose generates intelligent clinical triage', async () => {
    const res = await fetch(`${baseUrl}/api/ai/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symptoms: 'Throbbing headache on left side with light sensitivity and nausea',
        duration: '2 days',
        severity: 'Moderate'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.recommendedDepartment, 'Neurology');
    assert.ok(body.potentialConditions.length > 0);
    assert.ok(body.suggestedQuestions.length > 0);
    assert.ok(body.matchedDoctors.length > 0);
  });

  test('POST and GET /api/appointments creates and lists appointments', async () => {
    const apptPayload = {
      doctorId: 'doc-1',
      patientName: 'Jane Doe',
      patientEmail: 'jane.doe@example.com',
      date: '2026-11-15',
      time: '11:00 AM',
      mode: 'video',
      reason: 'Routine cardiovascular checkup'
    };

    const postRes = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apptPayload)
    });

    assert.strictEqual(postRes.status, 201);
    const postBody = await postRes.json();
    assert.strictEqual(postBody.success, true);
    assert.ok(postBody.appointment.id.startsWith('APT-AZ-'));
    assert.strictEqual(postBody.appointment.doctorName, 'Dr. Elena Rostova');

    const getRes = await fetch(`${baseUrl}/api/appointments?email=jane.doe@example.com`);
    assert.strictEqual(getRes.status, 200);
    const getBody = await getRes.json();
    assert.strictEqual(getBody.success, true);
    assert.ok(getBody.appointments.some((a) => a.id === postBody.appointment.id));
  });
});
