/**
 * Azure Cloud-Native Dashboard - Interactive Client Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const btnRefresh = document.getElementById('btn-refresh');
  const valPodName = document.getElementById('val-pod-name');
  const valNamespace = document.getElementById('val-namespace');
  const valNodeName = document.getElementById('val-node-name');
  const valMemoryPct = document.getElementById('val-memory-pct');
  const valHeapUsed = document.getElementById('val-heap-used');
  const valHeapTotal = document.getElementById('val-heap-total');
  const memoryFill = document.getElementById('memory-progress-fill');
  const valUptime = document.getElementById('val-uptime');
  const valRequestsCount = document.getElementById('val-requests-count');
  const valPid = document.getElementById('val-pid');
  const valNodeVer = document.getElementById('val-node-ver');
  const specAppName = document.getElementById('spec-app-name');
  const specPlatform = document.getElementById('spec-platform');

  const consoleEndpointLabel = document.getElementById('console-endpoint-label');
  const consoleStatusCode = document.getElementById('console-status-code');
  const consoleOutput = document.getElementById('console-output');
  const apiButtons = document.querySelectorAll('.api-btn');

  /**
   * Format Seconds into Human Readable Uptime
   */
  const formatUptime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  /**
   * Fetch System & Cluster Info (/api/info)
   */
  const fetchInfo = async () => {
    try {
      const res = await fetch('/api/info');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (valPodName) valPodName.textContent = data.kubernetes.podName;
      if (valNamespace) valNamespace.textContent = data.kubernetes.podNamespace;
      if (valNodeName) valNodeName.textContent = data.kubernetes.nodeName;
      if (valPid) valPid.textContent = data.runtime.pid;
      if (valNodeVer) valNodeVer.textContent = data.runtime.nodeVersion;
      if (specAppName) specAppName.textContent = `${data.application.name} v${data.application.version}`;
      if (specPlatform) specPlatform.textContent = `${data.runtime.platform} (${data.runtime.architecture})`;
    } catch (err) {
      console.warn('Could not fetch /api/info:', err);
    }
  };

  /**
   * Fetch Live Telemetry (/api/telemetry)
   */
  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/telemetry');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (valMemoryPct) valMemoryPct.textContent = `${data.memoryUsagePercent}%`;
      if (valHeapUsed) valHeapUsed.textContent = `${data.heapUsedMb} MB`;
      if (valHeapTotal) valHeapTotal.textContent = `of ${data.heapTotalMb} MB Heap`;
      if (memoryFill) memoryFill.style.width = `${Math.min(100, Math.max(5, data.memoryUsagePercent))}%`;

      if (valUptime) valUptime.textContent = formatUptime(data.uptimeSeconds);
      if (valRequestsCount) valRequestsCount.textContent = `${data.requestCount} reqs`;
    } catch (err) {
      console.warn('Could not fetch /api/telemetry:', err);
    }
  };

  /**
   * Interactive API Console Request Handler
   */
  const executeApiCall = async (endpoint, method = 'GET') => {
    if (consoleEndpointLabel) consoleEndpointLabel.textContent = `${method} ${endpoint}`;
    if (consoleStatusCode) {
      consoleStatusCode.textContent = 'Calling...';
      consoleStatusCode.style.color = '#F59E0B';
    }
    if (consoleOutput) consoleOutput.textContent = 'Executing HTTP request...';

    const startTime = performance.now();
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };

      if (method === 'POST') {
        options.body = JSON.stringify({
          client: 'Web-Dashboard-Console',
          message: 'Telemetry ping from browser',
          timestamp: new Date().toISOString()
        });
      }

      const res = await fetch(endpoint, options);
      const elapsed = Math.round(performance.now() - startTime);
      const data = await res.json();

      if (consoleStatusCode) {
        consoleStatusCode.textContent = `HTTP ${res.status} ${res.statusText} (${elapsed}ms)`;
        consoleStatusCode.style.color = res.ok ? '#34D399' : '#EF4444';
      }
      if (consoleOutput) {
        consoleOutput.textContent = JSON.stringify(data, null, 2);
      }
    } catch (err) {
      if (consoleStatusCode) {
        consoleStatusCode.textContent = 'Network Error';
        consoleStatusCode.style.color = '#EF4444';
      }
      if (consoleOutput) {
        consoleOutput.textContent = `Error executing request: ${err.message}`;
      }
    }
  };

  // Bind API Console Buttons
  apiButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      apiButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const endpoint = btn.getAttribute('data-endpoint');
      const method = btn.getAttribute('data-method') || 'GET';
      executeApiCall(endpoint, method);
    });
  });

  // Bind Refresh Button
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      btnRefresh.style.transform = 'scale(0.95)';
      setTimeout(() => (btnRefresh.style.transform = ''), 150);
      fetchInfo();
      fetchTelemetry();
      const activeBtn = document.querySelector('.api-btn.active');
      if (activeBtn) {
        const endpoint = activeBtn.getAttribute('data-endpoint');
        const method = activeBtn.getAttribute('data-method') || 'GET';
        executeApiCall(endpoint, method);
      }
    });
  }

  // Initial Data Load
  fetchInfo();
  fetchTelemetry();
  executeApiCall('/healthz', 'GET');

  // Automatic Background Telemetry Poll every 5 seconds
  setInterval(() => {
    fetchTelemetry();
  }, 5000);
});
