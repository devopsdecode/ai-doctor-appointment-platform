# ==============================================================================
# Runner Virtual Machine Outputs
# ==============================================================================

output "runner_vm_name" {
  description = "Name of the provisioned GitHub Self-Hosted Runner Virtual Machine."
  value       = azurerm_linux_virtual_machine.runner_vm.name
}

output "runner_private_ip" {
  description = "Static private IP address of the Runner Virtual Machine."
  value       = azurerm_network_interface.runner_nic.ip_configuration[0].private_ip_address
}

output "runner_vm_size" {
  description = "Compute SKU / size of the Runner Virtual Machine."
  value       = azurerm_linux_virtual_machine.runner_vm.size
}

output "runner_vm_id" {
  description = "Azure Resource ID of the Runner Virtual Machine."
  value       = azurerm_linux_virtual_machine.runner_vm.id
}

# ==============================================================================
# Resource Group & Networking Outputs
# ==============================================================================

output "resource_group_name" {
  description = "Name of the Azure Resource Group."
  value       = azurerm_resource_group.rg.name
}

output "virtual_network_name" {
  description = "Name of the Virtual Network."
  value       = azurerm_virtual_network.vnet.name
}

output "virtual_network_id" {
  description = "Resource ID of the Virtual Network."
  value       = azurerm_virtual_network.vnet.id
}

output "subnet_name" {
  description = "Name of the dedicated runner Subnet."
  value       = azurerm_subnet.runner_subnet.name
}

output "subnet_id" {
  description = "Resource ID of the dedicated runner Subnet."
  value       = azurerm_subnet.runner_subnet.id
}

output "nat_gateway_name" {
  description = "Name of the Azure NAT Gateway."
  value       = azurerm_nat_gateway.nat_gw.name
}

output "nat_gateway_public_ip" {
  description = "Public IP address allocated to the Azure NAT Gateway for egress traffic."
  value       = azurerm_public_ip.nat_pip.ip_address
}

# ==============================================================================
# Managed Identity Outputs
# ==============================================================================

output "managed_identity_principal_id" {
  description = "Principal ID (Object ID) of the System-Assigned Managed Identity on the runner VM."
  value       = azurerm_linux_virtual_machine.runner_vm.identity[0].principal_id
}

output "managed_identity_tenant_id" {
  description = "Tenant ID of the System-Assigned Managed Identity on the runner VM."
  value       = azurerm_linux_virtual_machine.runner_vm.identity[0].tenant_id
}

# ==============================================================================
# Optional Bastion Host Outputs
# ==============================================================================

output "bastion_host_name" {
  description = "Name of the Azure Bastion Host (if enabled)."
  value       = var.enable_bastion ? azurerm_bastion_host.bastion[0].name : null
}

# ==============================================================================
# SSH & Registration Guide Outputs
# ==============================================================================

output "ssh_private_key_pem" {
  description = "Generated private SSH key (PEM format). Sensitive output."
  value       = length(tls_private_key.runner_ssh) > 0 ? tls_private_key.runner_ssh[0].private_key_pem : null
  sensitive   = true
}

output "runner_registration_instructions" {
  description = "Step-by-step instructions to register the runner after deployment."
  value       = <<-EOT
    1. Connect to the VM via Azure Bastion or authorized private IP:
       az network bastion ssh --name ${var.bastion_name} --resource-group ${azurerm_resource_group.rg.name} --target-resource-id ${azurerm_linux_virtual_machine.runner_vm.id} --auth-type ssh-key --username ${var.admin_username}
    2. Obtain a short-lived runner registration token from GitHub:
       Repository -> Settings -> Actions -> Runners -> 'New self-hosted runner'
    3. Run the helper registration script on the VM:
       sudo register-runner --url https://github.com/<org>/<repo> --token <REGISTRATION_TOKEN>
    4. Verify runner status:
       sudo systemctl status actions.runner.*
  EOT
}
