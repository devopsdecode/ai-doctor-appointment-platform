# Azure Infrastructure & Cloud-Native App: GitHub Self-Hosted Runner VM Using Terraform

This repository provides an automated, secure, and production-ready end-to-end solution:
1. **Azure Infrastructure**: Terraform configuration provisioning a dedicated Ubuntu Linux Virtual Machine in Azure as a GitHub Actions Self-Hosted Runner within a private Virtual Network, using an Azure NAT Gateway for egress and Managed Identity for ACR & AKS connectivity.
2. **Cloud-Native Web Application**: A production Node.js microservice with health checks (`/healthz`, `/readyz`), system metrics (`/metrics`), live telemetry (`/api/telemetry`), and an interactive dark-mode glassmorphic observability dashboard.
3. **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci-cd.yml`) executing on this self-hosted runner to test, containerize, scan, publish to Azure Container Registry (ACR), and deploy to private Azure Kubernetes Service (AKS).
4. **Kubernetes Manifests**: Ready-to-deploy Kubernetes manifests in `k8s/` (Namespace, ConfigMap, Deployment with probes & security context, Service, and HPA).

---

## Repository Contents

```
├── .github/
│   └── workflows/
│       └── ci-cd.yml                # CI/CD pipeline targeting self-hosted runner
├── infrastructure/
│   └── terraform/                   # Complete Terraform project for Azure VM & Network
│       ├── providers.tf             # Terraform & AzureRM provider configuration
│       ├── main.tf                  # Resource Group, locals, and Log Analytics
│       ├── variables.tf             # All configurable parameters
│       ├── outputs.tf               # Infrastructure output values
│       ├── network.tf               # VNet, Subnet, NAT Gateway, Bastion, VNet Peering, Private DNS
│       ├── nsg.tf                   # NSG inbound/outbound rules & subnet association
│       ├── runner-vm.tf             # NIC, Linux VM, OS Disk, Cloud-Init template
│       ├── identity.tf              # Managed Identity RBAC assignments (ACR, AKS, Key Vault)
│       ├── cloud-init.yaml          # Bootstrapping (Docker, CLI tools, systemd runner service)
│       ├── terraform.tfvars.example # Production example variables
│       └── README.md                # Infrastructure documentation
├── src/                             # Node.js Application Source Code
│   ├── app.js                       # Express application setup & security middleware
│   ├── server.js                    # Server lifecycle & graceful shutdown
│   └── routes/
│       └── api.js                   # Endpoints: /healthz, /readyz, /metrics, /api/info, /api/telemetry
├── public/                          # Observability Web Dashboard
│   ├── index.html                   # Semantic HTML5 dashboard interface
│   ├── css/style.css                # Glassmorphic dark-mode design system (Vanilla CSS)
│   └── js/app.js                    # Real-time metrics polling & interactive API console
├── tests/                           # Test Suite
│   └── app.test.js                  # Integration tests for all endpoints
├── k8s/                             # Kubernetes Manifests for Private AKS
│   ├── namespace.yaml               # Application namespace (demo-app)
│   ├── configmap.yaml               # Application configuration
│   ├── deployment.yaml              # Pod deployment with readiness/liveness probes & security context
│   ├── service.yaml                 # ClusterIP Service routing
│   └── hpa.yaml                     # HorizontalPodAutoscaler (CPU & Memory)
├── scripts/
│   └── register-runner.sh           # Safe registration helper using short-lived tokens
├── Dockerfile                       # Multi-stage production container build
├── .dockerignore                    # Docker build exclusion rules
└── package.json                     # Node.js dependencies & test scripts
```

---

## 1. Running & Testing the Application Locally

### Prerequisites
- Node.js 18+ (tested on Node.js 20 & 26)
- npm 9+

### Install Dependencies
```bash
npm install
```

### Run Tests
The test suite validates health probes, system metrics, cluster metadata, and static file serving:
```bash
npm test
```

### Start the Application
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to view the interactive cloud-native telemetry dashboard.

---

## 2. Containerization (Docker)

Build the production multi-stage Docker image:
```bash
docker build -t sample-nodejs-app:latest .
```

Run the container:
```bash
docker run -p 3000:3000 --rm sample-nodejs-app:latest
```

---

## 3. Terraform Infrastructure Deployment

To deploy the private GitHub Self-Hosted Runner VM in Azure:

```bash
cd infrastructure/terraform

# 1. Initialize Terraform
terraform init

# 2. Validate configuration
terraform validate

# 3. Create execution plan
terraform plan -out=tfplan

# 4. Review and apply (manual review required)
terraform apply tfplan
```

Refer to [`infrastructure/terraform/README.md`](file:///Users/rajnadar/Desktop/june-project-end-to-end/infrastructure/terraform/README.md) for full architecture details, Bastion instructions, and registration steps.

---

## 4. End-to-End CI/CD Pipeline Flow

When code is pushed to `main`, GitHub Actions triggers `.github/workflows/ci-cd.yml` on the self-hosted runner:

1. **Continuous Integration (CI)**:
   - Runner VM executes unit & integration tests (`npm test`).
   - Authenticates to Azure Container Registry via VM Managed Identity (`az login --identity && az acr login`).
   - Builds container image tagged with commit SHA and `latest`.
   - Scans image for vulnerabilities using Trivy.
   - Pushes image to private ACR.
2. **Continuous Deployment (CD)**:
   - Connects to private AKS cluster over peered VNet.
   - Tests TCP 443 connectivity to private Kubernetes API (`kubectl cluster-info`).
   - Applies Kubernetes manifests (`k8s/`).
   - Verifies deployment rollout status (`kubectl rollout status deployment/nodejs-deployment`).
