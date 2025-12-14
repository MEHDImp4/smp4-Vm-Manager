# Copilot Instructions – Auto-Provisioning VM Platform

## Project Overview

This is a self-service VM hosting platform integrating **Proxmox**, **WireGuard**, **Cloudflare DNS**, and reverse-proxy systems (Nginx Proxy Manager or Cloudflare Tunnel). Target deployment: **UNRAID** with nested Proxmox.

## Architecture

### Core Components (to be implemented)
- **Backend API**: Orchestrates VM lifecycle, WireGuard config generation, and DNS management
- **Frontend**: Web interface for users to create/manage VMs and subdomains
- **Proxmox Integration**: API communication for VM CRUD operations
- **WireGuard Manager**: Generates isolated VPN configs per VM (user can only access their own VM)
- **DNS Manager**: Cloudflare API integration for subdomain provisioning (2 free per user)

### Key Integration Points
- Proxmox API: VM creation from templates, start/stop, IP retrieval
- WireGuard: Peer generation with `AllowedIPs` restrictions per VM
- Cloudflare API: DNS record management for user subdomains
- Nginx Proxy Manager / Cloudflare Tunnel: Service exposure from VMs

## Development Guidelines

### API Design
- Use RESTful endpoints for VM operations (`/api/vms`, `/api/vms/{id}/start`, etc.)
- Implement proper authentication before any VM or DNS operations
- Return WireGuard configs as downloadable `.conf` files

### Security Requirements
- Each WireGuard peer MUST be restricted to only access its assigned VM IP
- Validate user ownership before any VM operation
- Sanitize subdomain inputs to prevent DNS injection
- Store Proxmox/Cloudflare API credentials securely (environment variables or secrets manager)

### VM Provisioning Flow
1. User selects template + resources (CPU, RAM, storage)
2. Backend calls Proxmox API to clone template
3. Wait for VM to get IP address
4. Generate WireGuard peer config with that IP in `AllowedIPs`
5. Return config to user

### Subdomain Management
- Limit: 2 subdomains per user
- Format: `{user-chosen}.{platform-domain}`
- Point to VM's internal IP (accessible via WireGuard) or proxy endpoint

## File Structure Conventions

When implementing, organize as:
```
/backend          # API server
/frontend         # Web UI
/scripts          # WireGuard/Proxmox automation scripts
/templates        # VM template configs
/docker           # Container definitions if containerizing
```

## External Dependencies

- **Proxmox VE API**: https://pve.proxmox.com/pve-docs/api-viewer/
- **WireGuard**: Key generation via `wg genkey`, `wg pubkey`
- **Cloudflare API**: https://developers.cloudflare.com/api/

---

> **Note**: This project is in early development. Update these instructions as implementation patterns emerge.
