# ==============================================================================
# Managed Identity Role Assignments for CI/CD Pipeline Operations
# ==============================================================================

# Role Assignment: AcrPush on Azure Container Registry (for Docker Image Push)
resource "azurerm_role_assignment" "acr_push" {
  count                = var.acr_resource_id != null ? 1 : 0
  scope                = var.acr_resource_id
  role_definition_name = "AcrPush"
  principal_id         = azurerm_linux_virtual_machine.runner_vm.identity[0].principal_id
}

# Role Assignment: Azure Kubernetes Service Cluster User Role (for Kubeconfig access)
resource "azurerm_role_assignment" "aks_cluster_user" {
  count                = var.aks_cluster_id != null ? 1 : 0
  scope                = var.aks_cluster_id
  role_definition_name = "Azure Kubernetes Service Cluster User Role"
  principal_id         = azurerm_linux_virtual_machine.runner_vm.identity[0].principal_id
}

# Role Assignment: Azure Kubernetes Service RBAC Cluster Admin (for Deploying manifests & rollouts)
resource "azurerm_role_assignment" "aks_rbac_cluster_admin" {
  count                = var.aks_cluster_id != null ? 1 : 0
  scope                = var.aks_cluster_id
  role_definition_name = "Azure Kubernetes Service RBAC Cluster Admin"
  principal_id         = azurerm_linux_virtual_machine.runner_vm.identity[0].principal_id
}

# Role Assignment: Key Vault Secrets User (for reading secrets/certificates)
resource "azurerm_role_assignment" "key_vault_secrets_user" {
  count                = var.key_vault_id != null ? 1 : 0
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_virtual_machine.runner_vm.identity[0].principal_id
}
