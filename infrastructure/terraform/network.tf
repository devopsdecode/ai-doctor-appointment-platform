# ==============================================================================
# Virtual Network & Runner Subnet
# ==============================================================================

resource "azurerm_virtual_network" "vnet" {
  name                = var.vnet_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = var.vnet_address_space
  tags                = local.common_tags
}

resource "azurerm_subnet" "runner_subnet" {
  name                 = var.runner_subnet_name
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.runner_subnet_address_prefix]
}

# ==============================================================================
# Azure NAT Gateway for Outbound Internet Connectivity
# ==============================================================================

resource "azurerm_public_ip" "nat_pip" {
  name                = var.nat_public_ip_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2", "3"]
  tags                = local.common_tags
}

resource "azurerm_nat_gateway" "nat_gw" {
  name                    = var.nat_gateway_name
  location                = azurerm_resource_group.rg.location
  resource_group_name     = azurerm_resource_group.rg.name
  sku_name                = "Standard"
  idle_timeout_in_minutes = 10
  zones                   = ["1"]
  tags                    = local.common_tags
}

resource "azurerm_nat_gateway_public_ip_association" "nat_gw_pip_assoc" {
  nat_gateway_id       = azurerm_nat_gateway.nat_gw.id
  public_ip_address_id = azurerm_public_ip.nat_pip.id
}

resource "azurerm_subnet_nat_gateway_association" "runner_subnet_nat" {
  subnet_id      = azurerm_subnet.runner_subnet.id
  nat_gateway_id = azurerm_nat_gateway.nat_gw.id
}

# ==============================================================================
# Optional Azure Bastion Host for Private SSH Administration
# ==============================================================================

resource "azurerm_subnet" "bastion_subnet" {
  count                = var.enable_bastion ? 1 : 0
  name                 = "AzureBastionSubnet"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.bastion_subnet_address_prefix]
}

resource "azurerm_public_ip" "bastion_pip" {
  count               = var.enable_bastion ? 1 : 0
  name                = "pip-${var.bastion_name}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.common_tags
}

resource "azurerm_bastion_host" "bastion" {
  count               = var.enable_bastion ? 1 : 0
  name                = var.bastion_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "Standard"
  tags                = local.common_tags

  ip_configuration {
    name                 = "bastion-ip-configuration"
    subnet_id            = azurerm_subnet.bastion_subnet[0].id
    public_ip_address_id = azurerm_public_ip.bastion_pip[0].id
  }
}

# ==============================================================================
# VNet Peering to Remote Private AKS VNet
# ==============================================================================

resource "azurerm_virtual_network_peering" "runner_to_aks" {
  count                        = var.enable_aks_vnet_peering && var.aks_vnet_id != null ? 1 : 0
  name                         = "peering-runner-to-aks"
  resource_group_name          = azurerm_resource_group.rg.name
  virtual_network_name         = azurerm_virtual_network.vnet.name
  remote_virtual_network_id    = var.aks_vnet_id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
  use_remote_gateways          = false
}

resource "azurerm_virtual_network_peering" "aks_to_runner" {
  count                        = var.enable_aks_vnet_peering && var.aks_vnet_name != null && var.aks_resource_group_name != null ? 1 : 0
  name                         = "peering-aks-to-runner"
  resource_group_name          = var.aks_resource_group_name
  virtual_network_name         = var.aks_vnet_name
  remote_virtual_network_id    = azurerm_virtual_network.vnet.id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
  use_remote_gateways          = false
}

# ==============================================================================
# Private DNS Zone Virtual Network Link for AKS Private API Resolution
# ==============================================================================

resource "azurerm_private_dns_zone_virtual_network_link" "aks_dns_link" {
  count                 = var.aks_private_dns_zone_id != null ? 1 : 0
  name                  = "link-runner-vnet-aks-dns"
  resource_group_name   = split("/", var.aks_private_dns_zone_id)[4]
  private_dns_zone_name = split("/", var.aks_private_dns_zone_id)[8]
  virtual_network_id    = azurerm_virtual_network.vnet.id
  registration_enabled  = false
  tags                  = local.common_tags
}
