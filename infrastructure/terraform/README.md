# Azure Kubernetes Service (AKS) Cluster - Terraform Configuration

This Terraform project provisions a production-ready Azure Kubernetes Service (AKS) cluster and an Azure Container Registry (ACR) using standard, default configurations.

---

## 📦 Provisioned Resources

1. **Azure Resource Group**: `rg-aks-doctor-platform` (Location: `eastus`)
2. **Azure Container Registry (ACR)**: Basic SKU with automatic random name prefix (`acrdoctor<random>`)
3. **Azure Kubernetes Service (AKS)**:
   - Default Linux Node Pool with 2 worker nodes (`Standard_D2s_v5`)
   - Auto-scaling enabled (1 to 3 nodes)
   - Standard Kubenet networking with Standard Load Balancer
   - System-Assigned Managed Identity
4. **ACR Integration (`AcrPull`)**:
   - The AKS Kubelet Identity is automatically granted `AcrPull` on the ACR so Kubernetes pods pull images without needing manual credentials.

---

## 🚀 How to Deploy

From this directory:

```bash
# 1. Initialize Terraform
terraform init

# 2. Review the execution plan
terraform plan

# 3. Apply and provision the AKS cluster
terraform apply
```

---

## ☸️ Connect to Your AKS Cluster

After `terraform apply` finishes, fetch the credentials:

```bash
az aks get-credentials --resource-group rg-aks-doctor-platform --name aks-cluster-prod --overwrite-existing
kubectl get nodes
```
