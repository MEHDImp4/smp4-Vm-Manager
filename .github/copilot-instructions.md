# Copilot Instructions – Auto-Provisioning VM Platform

## Overview
This project automates the creation and management of isolated virtual machines using **Proxmox**, **WireGuard**, and **Cloudflare**. It provides a self-service platform for users to create VMs, manage VPN configurations, and expose services securely.

## Architecture
- **Backend**: Built with Node.js and Express, the backend orchestrates interactions with Proxmox, WireGuard, and Cloudflare.
  - **Key Components**:
    - **Controllers**: Handle incoming requests and orchestrate business logic (e.g., `src/controllers/instanceController.js`).
    - **Services**: Encapsulate external API interactions (e.g., `src/services/proxmox.service.js` for Proxmox API, `src/services/vpn.service.js` for VPN management).
    - **Routes**: Define API endpoints (e.g., `src/routes/authRoutes.js`).
    - **Cron Jobs**: Manage background tasks (e.g., `src/cron/consumptionCron.js` for point consumption).

- **Frontend**: Developed with React and Vite, it communicates with the backend via RESTful APIs and WebSockets for real-time updates.

## Developer Workflows
- **Starting the Application**:
  - Use `npm run dev` in the backend directory to start the server.
  - Ensure environment variables are set in a `.env` file, including `PROXMOX_URL`, `PROXMOX_API_TOKEN`, `CF_ACCOUNT_ID`, etc.

- **Testing**: 
  - Implement unit tests in the `tests` directory (not provided in the current structure, but recommended for future development).

- **Debugging**:
  - Use console logs strategically in service methods to trace API interactions (e.g., `console.log` in `src/services/vpn.service.js`).

## Project-Specific Conventions
- **Environment Variables**: All sensitive configurations are managed via environment variables. Ensure to check `.env.example` for required variables.
- **Error Handling**: Use try-catch blocks in service methods to handle API errors gracefully, logging errors for debugging.
- **Data Flow**: The backend communicates with Proxmox to manage VM lifecycles, while WireGuard configurations are generated per VM to ensure isolated access.

## Integration Points
- **Proxmox API**: Interactions are handled in `src/services/proxmox.service.js`. Ensure the Proxmox server is accessible and the API token is valid.
- **WireGuard**: Managed in `src/services/vpn.service.js`, which creates and deletes VPN clients based on VM lifecycle events.
- **Cloudflare**: Ingress rules for exposed services are managed in `src/services/cloudflare.service.js`. Ensure Cloudflare credentials are set correctly.

## Examples
- **Creating a VM**: Use the endpoint `POST /api/instances` with the required parameters to provision a new VM.
- **Managing VPN**: Call `createClient(targetIp)` in `vpn.service.js` to generate a WireGuard configuration for a new VM.

## Conclusion
This document serves as a guide for AI agents to navigate the codebase effectively. For any unclear sections or additional details needed, please provide feedback for further iterations.

Purpose: Equip AI agents to work productively in this repo by explaining architecture, flows, conventions, and run/debug tips grounded in current code.

## Architecture Map
- Backend (Node/Express + Prisma/SQLite): Orchestrates Proxmox LXC lifecycle, VPN client generation, Cloudflare Tunnel ingress, snapshots, and point consumption.
	- Entry: backend/src/index.js, routes under backend/src/routes, controllers under backend/src/controllers, services under backend/src/services.
	- Data: Prisma models in backend/prisma/schema.prisma (User, Instance, Snapshot, Domain, Template, TemplateVersion). DB is SQLite via DATABASE_URL.
- VPN microservice (Express + wireguard-tools): vpn/src/index.js exposes POST /client and DELETE /client to manage peers and emit client configs.
- Frontend (Vite/React): Calls backend under /api, opens SSH terminal via WS /ws/ssh, manages instances/domains/snapshots.
- Infra: docker-compose.yml defines services backend, frontend, vpn, cloudflared tunnel, watchtower, bridge network and volumes.

## Key Flows (as implemented)
- Instance provisioning (LXC):
	1) frontend POST /api/instances with template/name → backend creates DB `Instance` with status=provisioning and returns immediately.
	2) Background: clone template (TemplateVersion.proxmoxId) → start LXC → poll interfaces for eth0 IP → harden SSH (enable password auth, create smp4 user, set root/smp4 password) → add firewall rules → create VPN client (vpn service) and persist config → mark `Instance.status = online`.
- VPN config: backend calls vpn at http://smp4-vpn:3001/client with target VM IP; vpn returns `{clientIp, publicKey, config}`. AllowedIPs includes VPN subnet and the target VM /32. Config downloaded via GET /api/instances/:id/vpn.
- Domains via Cloudflare Tunnel: POST /api/instances/:id/domains adds ingress rule for `{cleanUser}-{cleanInstance}-{suffix}.smp4.xyz` → http://<vm-ip>:<port>. Removal deletes the ingress. Domain uniqueness enforced in DB.
- Snapshots: CRUD via /api/instances/:id/snapshots* calling Proxmox snapshot/rollback/backup endpoints. A daily cron (00:00) creates snapshots for all instances with a VMID.
- Points consumption: cron runs every minute, deducts per-minute cost from users with online instances; sets instances to stopped when balance hits 0, and records PointTransaction.

## Backend Conventions
- Auth: JWT in `Authorization: Bearer <token>`; `verifyToken` sets `req.user` with `id` and `email`. Controllers reference `req.user.id` (ensure consistency when adding code).
- Routes: mounted at /api/auth, /api/instances, /api/templates. Static uploads at /uploads mapped to /data/uploads.
- SSH WebSocket: server attaches WS at /ws/ssh; frontend connects with `?vmid=<vmid>&host=<ip>` and authenticates as `smp4`. See backend/src/services/ssh.service.js and frontend/src/pages/InstanceDetails.tsx.
- Templates: seed on startup from backend/src/config/templates.json via seedTemplates(). TemplateVersion os is currently hardcoded to 'default'.
- Proxmox service: backend/src/services/proxmox.service.js wraps clone/start/stop/reboot, interfaces, firewall rules, snapshot/backup APIs. Requires PROXMOX_URL, PROXMOX_API_TOKEN, PROXMOX_NODE.
- Cloudflare Tunnel service: backend/src/services/cloudflare.service.js edits tunnel ingress (not DNS records). Requires CF_ACCOUNT_ID, CF_API_TOKEN, CF_TUNNEL_ID.
- VPN service client: backend/src/services/vpn.service.js targets http://smp4-vpn:3001; deletion derives public key from PrivateKey in saved config.

## Frontend Conventions
- API base: fetch to relative `/api/...`; token stored in `localStorage.user.token` after auth.
- Live stats: poll `/api/instances/:id/stats` every 5s for CPU/RAM/disk/IP/uptime.
- SSH: open WS to `/ws/ssh` and send `{type:'auth', username:'smp4'}` then keystrokes via `{type:'input'}`; uses xterm with fit addon.
- Domains UI: InstanceDomains.tsx composes subdomain as `<user>-<instance>-<suffix>.smp4.xyz` and calls backend domain endpoints.

## Run & Debug
- Docker (recommended): docker-compose.yml wires backend, frontend (nginx), vpn, and cloudflared.
	- Required env: JWT_SECRET, DATABASE_URL (e.g., file:/data/dev.db), PROXMOX_URL, PROXMOX_API_TOKEN, PROXMOX_NODE, LXC_SSH_PASSWORD, BACKEND_IP, CF_ACCOUNT_ID, CF_API_TOKEN, CF_TUNNEL_ID, CF_TUNNEL_TOKEN, VPN_ENDPOINT.
	- `deploy.sh` pulls latest images and `up -d` with remove-orphans; watchtower auto-updates backend/frontend containers.
- Local backend: `npm run dev` (nodemon) or `npm start` (runs `prisma db push` first). Ensure .env exports DATABASE_URL and required Proxmox/Cloudflare/VPN vars.
- Local frontend: `npm run dev` (Vite). It expects backend on same origin or a dev proxy mapping `/api` and `/ws/ssh` to backend.
- VPN service: requires kernel modules (wireguard, iptables); best run in its Docker container (see vpn/Dockerfile).

## Pointers & Examples
- Provisioning logic: backend/src/controllers/instanceController.js (`createInstance`, `getInstanceStats`, `getVpnConfig`, domain handlers).
- Cron jobs: backend/src/cron/consumptionCron.js and backend/src/cron/snapshotCron.js.
- Prisma models: backend/prisma/schema.prisma; seeding: backend/src/scripts/seedTemplates.js with backend/src/config/templates.json.
- Cloudflare ingress edit: backend/src/services/cloudflare.service.js.
- VPN generator: vpn/src/index.js; backend client: backend/src/services/vpn.service.js.

Notes
- Security hardening for LXC uses Proxmox firewall rules and SSH hardening steps. Domain inputs are sanitized; keep using `cleanSuffix` patterns when adding features.
- When adding controllers, prefer `req.user.id` and enforce ownership checks like existing handlers do.
