variable "subscription_id" {
  type        = string
  description = "Azure Subscription ID"
  default     = "cd459aae-8e9d-4069-8ab8-fd60d11b3e04"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the Azure Resource Group"
  default     = "rg-aks-doctor-platform"
}

variable "location" {
  type        = string
  description = "Azure region for all resources"
  default     = "eastus"
}

variable "cluster_name" {
  type        = string
  description = "Name of the Azure Kubernetes Service (AKS) cluster"
  default     = "aks-cluster-prod"
}

variable "dns_prefix" {
  type        = string
  description = "DNS prefix for the AKS cluster FQDN"
  default     = "aks-doctor-platform"
}

variable "node_count" {
  type        = number
  description = "Initial number of worker nodes in the default node pool"
  default     = 1
}

variable "vm_size" {
  type        = string
  description = "Azure Virtual Machine size for the AKS worker nodes"
  default     = "Standard_B2s"
}

variable "os_disk_size_gb" {
  type        = number
  description = "Disk size in GB for the worker node OS disk"
  default     = 30
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version to deploy (leave null for Azure default)"
  default     = null
}

variable "enable_auto_scaling" {
  type        = bool
  description = "Enable cluster autoscaler for the default node pool"
  default     = false
}

variable "min_count" {
  type        = number
  description = "Minimum number of nodes when autoscaling is enabled"
  default     = null
}

variable "max_count" {
  type        = number
  description = "Maximum number of nodes when autoscaling is enabled"
  default     = null
}

variable "tags" {
  type        = map(string)
  description = "Resource tags applied to all Azure resources"
  default = {
    Project     = "AI-Doctor-Appointment-Platform"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}
