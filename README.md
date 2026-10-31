# AI Doctor Appointment Platform (Kubernetes & CI/CD)

An AI-powered Doctor Appointment & Telemedicine Platform built with Node.js, Docker, Kubernetes, and automated GitHub Actions CI/CD.

---

## 🌟 Key Features

1. **🩺 Doctor Discovery & Booking**:
   - Browse verified medical specialists across Cardiology, Neurology, Dermatology, Pediatrics, Orthopedics, and General Medicine.
   - Interactive appointment scheduling with live time-slot selection (`09:30 AM`, `11:00 AM`, etc.).
   - Support for both **HD Video Telehealth** and **In-Person Clinic Visits**.

2. **🤖 AI Symptom Checker & Clinical Triage**:
   - Natural language symptom input with quick symptom tags.
   - Evaluates urgency levels (Routine / Moderate / Urgent Attention), suspected conditions, and pre-consultation questions.
   - 1-click matching to relevant medical specialists.

3. **📅 Patient Appointments Management**:
   - View scheduled appointments, cancel visits, and export calendar events (`.ics` download).
   - One-click launch into the virtual telehealth consultation room.

4. **📹 Virtual Telehealth Room**:
   - Simulated encrypted HD video call with vital telemetry (ECG / heart rate monitor, audio waveform).
   - Real-time AI clinical scribe transcription and notes generator.

5. **☸️ Kubernetes-Native Deployment**:
   - Production manifests in `k8s/` including Namespace, ConfigMap, Deployment with liveness/readiness probes, Service, and Horizontal Pod Autoscaler (HPA).
   - Automated CI/CD pipeline (`.github/workflows/ci-cd.yml`) executing tests, building multi-stage Docker images, scanning with Trivy, and deploying to Kubernetes.

---

## 📁 Repository Structure

```
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # GitHub Actions CI/CD deployment pipeline
├── k8s/                       # Kubernetes Production Manifests
│   ├── namespace.yaml         # Application namespace (demo-app)
│   ├── configmap.yaml         # Application environment configuration
│   ├── deployment.yaml        # Deployment (2 replicas, non-root user, probes, limits)
│   ├── service.yaml           # Kubernetes Service routing
│   └── hpa.yaml               # HorizontalPodAutoscaler (CPU & memory scaling)
├── src/                       # Node.js Application Source Code
│   ├── app.js                 # Express app setup, Helmet security, routes
│   ├── server.js              # Server lifecycle & graceful shutdown
│   └── routes/
│       └── api.js             # APIs: Doctors, Appointments, AI Triage, /healthz, /metrics
├── public/                    # Frontend Web Application
│   ├── index.html             # Semantic HTML5 single-page application
│   ├── css/style.css          # Glassmorphic dark-mode design system
│   ├── js/app.js              # Client application logic & API integration
│   └── images/                # Medical specialist avatars
├── tests/                     # Test Suite
│   └── app.test.js            # Integration tests (11 tests covering all APIs)
├── Dockerfile                 # Multi-stage production container build
├── .dockerignore              # Docker build exclusions
├── .gitignore                 # Git ignore rules
└── package.json               # Dependencies & scripts
```

---

## 🚀 Local Development

### 1. Install & Test
```bash
# Install dependencies
npm install

# Run automated tests
npm test

# Start local development server
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 2. Run with Docker
```bash
# Build production container image
docker build -t ai-doctor-appointment-platform .

# Run container locally
docker run -d -p 3000:3000 --name ai-doctor-app ai-doctor-appointment-platform
```

---

## ☸️ Deploying to Kubernetes

Deploy all manifests to your Kubernetes cluster:

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Apply configmap
kubectl apply -f k8s/configmap.yaml

# 3. Deploy application pods
kubectl apply -f k8s/deployment.yaml

# 4. Expose service and autoscaling
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml

# 5. Verify rollout status
kubectl rollout status deployment/nodejs-deployment -n demo-app
kubectl get pods,svc -n demo-app
```

---

## 🔄 Automated CI/CD Pipeline

When commits are pushed to `main`, GitHub Actions (`.github/workflows/ci-cd.yml`):
1. **CI**: Checks out code, runs automated tests (`npm test`), builds Docker container, and scans for vulnerabilities.
2. **Push**: Publishes the image to your container registry.
3. **CD**: Connects to your Kubernetes cluster, updates the image tag, applies `k8s/` manifests, and verifies the rollout.
