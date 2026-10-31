# ==============================================================================
# SSH Key Management
# ==============================================================================

resource "tls_private_key" "runner_ssh" {
  count     = var.ssh_public_key == null ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 4096
}

# ==============================================================================
# Cloud-Init Template Configuration
# ==============================================================================

data "cloudinit_config" "runner_cloud_init" {
  gzip          = true
  base64_encode = true

  part {
    content_type = "text/cloud-config"
    content = templatefile("${path.module}/cloud-init.yaml", {
      runner_user    = var.runner_user
      runner_version = var.runner_version
    })
    filename = "cloud-init.yaml"
  }
}

# ==============================================================================
# Network Interface (NIC) - Static Private IP, Strictly No Public IP
# ==============================================================================

resource "azurerm_network_interface" "runner_nic" {
  name                = "nic-${var.runner_vm_name}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  tags                = local.common_tags

  ip_configuration {
    name                          = "ipconfig-runner"
    subnet_id                     = azurerm_subnet.runner_subnet.id
    private_ip_address_allocation = "Static"
    private_ip_address            = var.runner_private_ip
    public_ip_address_id          = null
  }
}

# ==============================================================================
# Linux Virtual Machine (GitHub Self-Hosted Runner)
# ==============================================================================

resource "azurerm_linux_virtual_machine" "runner_vm" {
  name                            = var.runner_vm_name
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = azurerm_resource_group.rg.location
  size                            = var.runner_vm_size
  admin_username                  = var.admin_username
  network_interface_ids           = [azurerm_network_interface.runner_nic.id]
  disable_password_authentication = true
  custom_data                     = data.cloudinit_config.runner_cloud_init.rendered
  tags                            = local.common_tags

  admin_ssh_key {
    username   = var.admin_username
    public_key = local.effective_ssh_public_key
  }

  os_disk {
    name                 = "osdisk-${var.runner_vm_name}"
    caching              = "ReadWrite"
    storage_account_type = var.os_disk_type
    disk_size_gb         = var.os_disk_size_gb
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = var.ubuntu_os_version
    version   = "latest"
  }

  identity {
    type = "SystemAssigned"
  }
}

# ==============================================================================
# Optional Azure Monitor Linux Agent (Log Analytics Integration)
# ==============================================================================

resource "azurerm_virtual_machine_extension" "azure_monitor_agent" {
  count                      = var.enable_log_analytics ? 1 : 0
  name                       = "AzureMonitorLinuxAgent"
  virtual_machine_id         = azurerm_linux_virtual_machine.runner_vm.id
  publisher                  = "Microsoft.Azure.Monitor"
  type                       = "AzureMonitorLinuxAgent"
  type_handler_version       = "1.28"
  auto_upgrade_minor_version = true
  tags                       = local.common_tags
}
