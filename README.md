# Project – Auto-Provisioning VM Platform (Proxmox + WireGuard + Cloudflare)

## Overview
This project provides a fully automated workflow for creating and managing isolated virtual machines for end-users.  
It integrates **Proxmox**, **WireGuard**, **Cloudflare DNS**, and an optional **reverse-proxy system** (Nginx Proxy Manager or Cloudflare Tunnel) to deliver a self-service VM hosting platform.

Each user can:
- Create virtual machines through a web interface.
- Receive a dedicated WireGuard VPN configuration that gives access **only** to their own VM.
- Generate up to **two free subdomains** under the platform’s main domain.
- Optionally expose services running inside their VM through Nginx Proxy Manager or Cloudflare Tunnel.

The platform is designed to run on **UNRAID**, with a nested **Proxmox** installation managing VM creation.

---

## Features

### 1. Automated VM Creation (Proxmox API)
- Uses Proxmox as the virtualization provider.
- VMs are created from predefined templates (e.g., Debian/Ubuntu).
- Users can choose CPU, RAM, and storage.
- Backend communicates with Proxmox API for:
  - VM creation  
  - Start/stop operations  
  - Retrieval of VM IP address  

### 2. Isolated WireGuard VPN Access
Each VM gets its own WireGuard peer:
- A WireGuard configuration is generated automatically.
- Peer is restricted with:
