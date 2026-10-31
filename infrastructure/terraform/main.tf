# ==============================================================================
# Azure Resource Group & Common Data Sources
# ==============================================================================

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
  tags     = local.common_tags
}

locals {
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      Provisioner = "Terraform"
    }
  )

  # SSH Key Resolution
  effective_ssh_public_key = var.ssh_public_key != null ? var.ssh_public_key : (
    length(tls_private_key.runner_ssh) > 0 ? tls_private_key.runner_ssh[0].public_key_openssh : ""
  )

  # Log Analytics Workspace Resolution
  effective_log_analytics_workspace_id = var.enable_log_analytics ? (
    var.log_analytics_workspace_id != null ? var.log_analytics_workspace_id : (
      length(azurerm_log_analytics_workspace.law) > 0 ? azurerm_log_analytics_workspace.law[0].id : null
    )
  ) : null
}

# ==============================================================================
# Optional Azure Log Analytics Workspace
# ==============================================================================

resource "azurerm_log_analytics_workspace" "law" {
  count               = var.enable_log_analytics && var.log_analytics_workspace_id == null ? 1 : 0
  name                = "law-runner-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.common_tags
}
