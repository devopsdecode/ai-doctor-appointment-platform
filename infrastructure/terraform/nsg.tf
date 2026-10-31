# ==============================================================================
# Network Security Group (NSG) for Runner Subnet
# ==============================================================================

resource "azurerm_network_security_group" "runner_nsg" {
  name                = "nsg-${var.runner_subnet_name}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  tags                = local.common_tags

  # ----------------------------------------------------------------------------
  # Inbound Security Rules
  # ----------------------------------------------------------------------------

  # Allow SSH from Azure Bastion Subnet (if Bastion is enabled)
  dynamic "security_rule" {
    for_each = var.enable_bastion ? [1] : []
    content {
      name                       = "Allow-Bastion-SSH-Inbound"
      priority                   = 100
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "22"
      source_address_prefix      = var.bastion_subnet_address_prefix
      destination_address_prefix = var.runner_subnet_address_prefix
    }
  }

  # Allow SSH only from explicitly authorized private admin CIDRs (e.g., VPN/DirectRoute)
  dynamic "security_rule" {
    for_each = length(var.admin_ssh_source_ranges) > 0 ? [1] : []
    content {
      name                       = "Allow-Authorized-Admin-SSH-Inbound"
      priority                   = 110
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "22"
      source_address_prefixes    = var.admin_ssh_source_ranges
      destination_address_prefix = var.runner_subnet_address_prefix
    }
  }

  # Strictly DENY all inbound traffic from the public Internet
  security_rule {
    name                       = "Deny-All-Internet-Inbound"
    priority                   = 4000
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  # ----------------------------------------------------------------------------
  # Outbound Security Rules
  # ----------------------------------------------------------------------------

  # Allow Outbound HTTPS (TCP 443) to Internet (GitHub Actions, Docker Hub, Package Repos)
  security_rule {
    name                       = "Allow-Outbound-HTTPS-Internet"
    priority                   = 100
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "Internet"
  }

  # Allow Outbound HTTP (TCP 80) to Internet (Ubuntu apt mirrors, package updates)
  security_rule {
    name                       = "Allow-Outbound-HTTP-Internet"
    priority                   = 110
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "Internet"
  }

  # Allow Outbound DNS (TCP/UDP 53) to Virtual Network / Azure DNS
  security_rule {
    name                       = "Allow-Outbound-DNS"
    priority                   = 120
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "53"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  # Allow Outbound NTP (UDP 123) for system clock synchronization
  security_rule {
    name                       = "Allow-Outbound-NTP"
    priority                   = 130
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Udp"
    source_port_range          = "*"
    destination_port_range     = "123"
    source_address_prefix      = "*"
    destination_address_prefix = "Internet"
  }

  # Allow Outbound HTTPS (TCP 443) to Azure Services (ACR, Key Vault, ARM, Azure AD)
  security_rule {
    name                       = "Allow-Outbound-AzureCloud"
    priority                   = 140
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "AzureCloud"
  }

  # Allow Outbound HTTPS (TCP 443) to Private AKS Cluster API
  security_rule {
    name                       = "Allow-Outbound-Private-AKS-API"
    priority                   = 150
    direction                  = "Outbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = var.aks_subnet_address_prefix != null ? var.aks_subnet_address_prefix : "VirtualNetwork"
  }
}

# ==============================================================================
# NSG Association to Runner Subnet
# ==============================================================================

resource "azurerm_subnet_network_security_group_association" "runner_nsg_assoc" {
  subnet_id                 = azurerm_subnet.runner_subnet.id
  network_security_group_id = azurerm_network_security_group.runner_nsg.id
}
