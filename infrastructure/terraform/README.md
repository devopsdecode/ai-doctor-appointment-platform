# Azure Infrastructure: GitHub Self-Hosted Runner VM Using Terraform

This repository provides an enterprise-grade Terraform project that provisions a dedicated Ubuntu Linux Virtual Machine in Microsoft Azure for hosting a GitHub Actions Self-Hosted Runner.

The runner is deployed completely inside a private Azure Virtual Network without a public IP address, using an Azure NAT Gateway for secure outbound internet connectivity, and connects to private Azure Kubernetes Service (AKS) APIs and Azure Container Registry (ACR) using Azure Managed Identity.

---

## Architecture Overview

```
                                      +---------------------------------------------+
                                      |             Azure Cloud Services            |
                                      |  +----------------+    +-----------------+  |
                                      |  | Azure Container|    | Azure Key Vault |  |
                                      |  | Registry (ACR) |    |                 |  |
                                      |  +----------------+    +-----------------+  |
                                      +---------------------------------------------+
                                                             ^
                                                             | HTTPS (Managed Identity)
+--------------------------------------------------------------------------------------------------+
| Azure Virtual Network (10.100.0.0/16)                                                            |
|                                                                                                  |
|   +------------------------------------+          +------------------------------------------+   |
|   | AzureBastionSubnet (10.100.2.0/26) |          | Dedicated Runner Subnet (10.100.1.0/24)  |   |
|   |                                    |          |                                          |   |
|   |  +------------------------------+  |  SSH:22  |  +------------------------------------+  |   |
|   |  | Azure Bastion Host           |==+=========>|  | Ubuntu 22.04 LTS Virtual Machine   |  |   |
|   |  | (Private Administration)     |  | (Private)|  |  - Static IP: 10.100.1.10          |  |   |
|   |  +------------------------------+  |          |  |  - No Public IP                    |  |   |
|   +------------------------------------+          |  |  - System-Assigned Managed Identity|  |   |
|                                                   |  |  - Docker, Azure CLI, kubectl, Helm|  |   |
|                                                   |  |  - Dedicated 'github-runner' user  |  |   |
|                                                   |  +------------------------------------+  |   |
|                                                   +-------------------|----------------------+   |
+-----------------------------------------------------------------------|--------------------------+
                                                                        |
                                         +------------------------------+------------------------------+
                                         |                                                             |
                                         v Outbound HTTPS                                              v TCP 443 (VNet Peering)
                        +---------------------------------+                           +---------------------------------+
                        | Azure NAT Gateway               |                           | Private AKS Virtual Network     |
                        | - Standard SKU                  |                           | - Private Kubernetes API Server |
                        | - Dedicated Static Public IP    |                           | - Private DNS Zone Resolution   |
                        +---------------------------------+                           +---------------------------------+
                                         |
                                         v
                        +---------------------------------+
                        | Internet / GitHub Actions       |
                        | (Outbound HTTPS only)           |
                        +---------------------------------+
```

---

## Key Features

1. **Strictly Private VM**:
   - Zero public IP address assigned to the VM NIC.
   - Resides on a dedicated subnet (`10.100.1.0/24`) inside a private VNet.
   - Network Security Group (NSG) blocks all inbound traffic from the public Internet.

2. **Outbound Internet via Azure NAT Gateway**:
   - Dedicated Azure NAT Gateway with a Standard Static Public IP associated with the runner subnet.
   - Enables the runner to establish outbound HTTPS (TCP 443) connections to GitHub Actions, Docker Hub, Ubuntu apt repositories, and package registries.

3. **Private AKS & Azure Services Connectivity**:
   - Outbound TCP 443 connectivity to private AKS API endpoints.
   - Built-in support for VNet Peering to remote AKS VNets.
   - Azure Private DNS Zone virtual network link integration for resolving private AKS API server FQDNs.

4. **Zero-Secret Authentication with System-Assigned Managed Identity**:
   - VM utilizes Azure System-Assigned Managed Identity.
   - Role assignments provisioned directly in Terraform:
     - `AcrPush` / `AcrPull` on Azure Container Registry (no stored registry credentials needed).
     - `Azure Kubernetes Service Cluster User Role` and `Azure Kubernetes Service RBAC Cluster Admin` for deploying to private AKS.
     - `Key Vault Secrets User` on Azure Key Vault.

5. **Automated Cloud-Init Software Stack**:
   - Dedicated Linux user: `github-runner` with home directory and `docker` group membership.
   - Docker Engine (official CE release with compose & buildx plugins).
   - Azure CLI (`az`).
   - Kubernetes CLI (`kubectl`).
   - Helm (v3).
   - Git, jq, curl, unzip, and all GitHub runner OS dependencies.
   - GitHub Actions Runner binaries pre-extracted in `/actions-runner`.
   - Helper scripts `/usr/local/bin/register-runner` and `/usr/local/bin/unregister-runner`.

6. **Secure Token Registration**:
   - **No tokens in code**: Personal Access Tokens (PATs) and runner registration tokens are NEVER stored in Terraform files, state, or cloud-init.
   - Operators register the runner using a short-lived token generated on-demand via the GitHub UI.

---

## Project Structure

```
infrastructure/terraform/
├── providers.tf             # Terraform & AzureRM provider configurations
├── main.tf                  # Resource Group, local values, and optional Log Analytics
├── variables.tf             # All configurable parameters with documentation and defaults
├── outputs.tf               # Terraform output values (IPs, IDs, Identity, next steps)
├── network.tf               # VNet, Subnet, NAT Gateway, Bastion, VNet Peering, Private DNS
├── nsg.tf                   # NSG inbound/outbound rules & subnet association
├── runner-vm.tf             # NIC, Linux VM, OS Disk, Cloud-Init template, Monitor extension
├── identity.tf              # RBAC role assignments for ACR, AKS, and Key Vault
├── cloud-init.yaml          # Multi-stage cloud-init bootstrapping template
└── terraform.tfvars.example # Example variable values for production deployments
```

---

## Terraform Execution Workflow

> **Note**: Do not automatically execute `terraform apply` or `terraform destroy` in automated pipelines without manual review.

### Step 1: Initialize Terraform
Initialize working directory and download AzureRM, Cloudinit, and TLS providers:
```bash
cd infrastructure/terraform
terraform init
```

### Step 2: Validate Configuration
Validate syntax, dependencies, and configuration schema:
```bash
terraform validate
```

### Step 3: Configure Variables
Copy example variables and adjust them to your Azure environment:
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your Azure Subscription details, IP ranges, and resource IDs
```

### Step 4: Generate Execution Plan
Create and inspect the execution plan:
```bash
terraform plan -out=tfplan
```

### Step 5: Apply Infrastructure
Apply the planned changes to Azure:
```bash
terraform apply tfplan
```

### Step 6: Teardown / Destroy (When Retiring Infrastructure)
When the runner infrastructure is no longer needed:
```bash
terraform destroy
```

---

## Terraform Outputs

Upon successful execution of `terraform apply`, Terraform outputs the following values:

| Output Name | Description | Example Value |
|---|---|---|
| `runner_vm_name` | Name of the provisioned Runner VM | `vm-github-runner-01` |
| `runner_private_ip` | Static private IP address of the Runner VM | `10.100.1.10` |
| `resource_group_name` | Azure Resource Group name | `rg-github-runner` |
| `virtual_network_name`| Virtual Network name | `vnet-github-runner` |
| `subnet_name` | Dedicated Runner Subnet name | `snet-github-runner` |
| `runner_vm_size` | Compute SKU / VM size | `Standard_B2s` |
| `managed_identity_principal_id` | Object ID of VM Managed Identity | `a1b2c3d4-e5f6-...` |
| `managed_identity_tenant_id` | Azure AD Tenant ID | `98765432-1234-...` |
| `nat_gateway_public_ip` | Public IP used for outbound NAT egress | `20.50.100.25` |
| `runner_registration_instructions` | Step-by-step registration instructions | Shell guide |

---

## GitHub Runner Registration Guide

Once the VM is provisioned:

### 1. Connect Securely to the VM

Because the VM has no public IP, connect using one of the following methods:

**Method A: Using Azure Bastion (Recommended)**
```bash
az network bastion ssh \
  --name bas-github-runner \
  --resource-group rg-github-runner \
  --target-resource-id $(terraform output -raw runner_vm_id) \
  --auth-type ssh-key \
  --username azureuser \
  --ssh-key ~/.ssh/id_rsa
```

**Method B: From an internal jumpbox or peered network / VPN**
```bash
ssh -i ~/.ssh/id_rsa azureuser@10.100.1.10
```

### 2. Generate a Short-Lived Registration Token in GitHub
1. In your GitHub repository (or organization), navigate to:
   **Settings** &rarr; **Actions** &rarr; **Runners** &rarr; **New self-hosted runner**.
2. Select OS: **Linux**, Architecture: **x64**.
3. Copy the short-lived registration token (valid for 1 hour).

### 3. Register the Runner on the VM
Execute the built-in helper script:
```bash
sudo register-runner \
  --url https://github.com/<your-org-or-user>/<your-repo> \
  --token <YOUR_SHORT_LIVED_TOKEN> \
  --name vm-gh-runner-01 \
  --labels self-hosted,linux,azure,docker
```

The script will:
- Configure the runner under the `github-runner` Linux user.
- Apply labels: `self-hosted`, `linux`, `azure`, `docker`.
- Install the runner as a native `systemd` service.
- Start and enable the service on boot.

### 4. Verify Runner Status in GitHub
In GitHub, visit **Settings** &rarr; **Actions** &rarr; **Runners**.
You will see the runner listed with status **Idle** (green) and labels:
- `self-hosted`
- `linux`
- `azure`
- `docker`

---

## CI/CD Workflow Integration

Both Continuous Integration (CI) and Continuous Deployment (CD) jobs execute directly on this self-hosted runner:

```yaml
runs-on: [self-hosted, linux, azure, docker]
```

### CI Pipeline
- Checks out repository code.
- Runs tests (Node.js test suite inside Docker).
- Authenticates to Azure Container Registry using the VM's Managed Identity:
  ```bash
  az login --identity
  az acr login --name <your-acr-name>
  ```
- Builds the production Docker image.
- Runs vulnerability scanning via Trivy.
- Pushes the image to Azure Container Registry.

### CD Pipeline
- Connects to the Private AKS cluster through Azure VNet peering:
  ```bash
  az login --identity
  az aks get-credentials --resource-group <aks-rg> --name <aks-cluster>
  ```
- Tests TCP 443 connectivity to the private Kubernetes API server:
  ```bash
  kubectl cluster-info
  ```
- Deploys application manifests / Helm charts.
- Verifies rollout completion:
  ```bash
  kubectl rollout status deployment/<app-name> --timeout=180s
  ```

See the complete working pipeline in [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml).
