# ==============================================================================
# Resource Group & Azure Container Registry (ACR)
# ==============================================================================

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

# Unique suffix for globally unique ACR naming
resource "random_string" "acr_suffix" {
  length  = 6
  special = false
  upper   = false
}

# Azure Container Registry (ACR) with default configuration
resource "azurerm_container_registry" "acr" {
  name                = "acrdoctor${random_string.acr_suffix.result}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Basic"
  admin_enabled       = true
  tags                = var.tags
}
