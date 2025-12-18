# Copilot Instructions – Auto-Provisioning VM Platform

## Overview
Automates VM provisioning with Proxmox, VPN access via WireGuard, and ingress via
Cloudflare. Users self-serve VMs, get per-VM VPN configs, and attach subdomains.

## Architecture
- Backend (Node/Express + Prisma/SQLite). Entry: backend/src/index.js. Controllers:
	backend/src/controllers. Services: backend/src/services. Routes: backend/src/routes.
	Cron: backend/src/cron.
- VPN microservice (Express + wireguard-tools): vpn/src/index.js exposes POST/DELETE
	/client to manage peers and return configs.
- Frontend (Vite/React): calls backend `/api` and `/ws/ssh` for SSH terminal.
- Infra: docker-compose.yml wires backend, frontend (nginx), vpn, cloudflared tunnel,
	watchtower.

## Key Flows
- Provision: POST /api/instances → create DB record (status provisioning) → clone
	template (TemplateVersion.proxmoxId) → start LXC → poll eth0 IP → harden SSH
	(password auth, smp4 user, root/smp4 password) → firewall rules → create VPN client
	→ mark online.
- VPN config: backend calls http://smp4-vpn:3001/client with VM IP; stores vpnConfig;
	GET /api/instances/:id/vpn downloads.
- Domains: POST /api/instances/:id/domains creates ingress `{user}-{instance}-{suffix}.smp4.xyz`
	→ http://<vm-ip>:<port>; removal deletes ingress; uniqueness enforced.
- Snapshots: CRUD /api/instances/:id/snapshots*; daily cron (00:00) snapshots all
	instances with vmid.
- Points: cron every minute deducts cost; stops instances at 0 balance and records
	PointTransaction.

## Conventions
- Auth: JWT Bearer; verifyToken sets req.user. Enforce ownership checks as in existing
	controllers.
- Templates: seeded from backend/src/config/templates.json via
	backend/src/scripts/seedTemplates.js; TemplateVersion os defaults to `default`.
- Proxmox: backend/src/services/proxmox.service.js clones/starts/stops LXC, firewall,
	snapshots/backups. Needs PROXMOX_URL, PROXMOX_API_TOKEN, PROXMOX_NODE.
- Cloudflare tunnel: backend/src/services/cloudflare.service.js edits tunnel ingress
	(not DNS). Needs CF_ACCOUNT_ID, CF_API_TOKEN, CF_TUNNEL_ID.
- VPN client: backend/src/services/vpn.service.js targets http://smp4-vpn:3001;
	deletion derives public key from PrivateKey in config.
- Frontend: API base `/api`; token in localStorage.user.token; stats polled every 5s at
	/api/instances/:id/stats; SSH WS `/ws/ssh` with `{type:'auth', username:'smp4'}` then
	`{type:'input'}`.

## Run & Debug
- Docker: docker-compose.yml; set JWT_SECRET, DATABASE_URL, PROXMOX_URL,
	PROXMOX_API_TOKEN, PROXMOX_NODE, LXC_SSH_PASSWORD, BACKEND_IP, CF_ACCOUNT_ID,
	CF_API_TOKEN, CF_TUNNEL_ID, CF_TUNNEL_TOKEN, VPN_ENDPOINT.
- Local backend: `npm run dev` (nodemon) or `npm start` (runs `prisma db push`).
- Local frontend: `npm run dev` (Vite); backend same origin or dev proxy for `/api`
	and `/ws/ssh`.
- VPN service: requires wireguard/iptables; best via vpn Docker container.

## Pointers
- Provisioning logic: backend/src/controllers/instanceController.js.
- Cron: backend/src/cron/snapshotCron.js and backend/src/cron/consumptionCron.js.
- Prisma models: backend/prisma/schema.prisma; seeding: backend/src/scripts/seedTemplates.js.
- Cloudflare ingress: backend/src/services/cloudflare.service.js.
- Frontend SSH/instances: frontend/src/pages/InstanceDetails.tsx.
