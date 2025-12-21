# SMP4 VM Manager

> Auto-Provisioning VM Platform with Proxmox, WireGuard VPN, and Cloudflare Tunnel

[![Tests](https://github.com/MEHDImp4/smp4-Vm-Manager/actions/workflows/tests.yml/badge.svg)](https://github.com/MEHDImp4/smp4-Vm-Manager/actions/workflows/tests.yml)
[![Docker](https://github.com/MEHDImp4/smp4-Vm-Manager/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/MEHDImp4/smp4-Vm-Manager/actions/workflows/docker-publish.yml)

## Overview

A fully automated platform for creating and managing isolated virtual machines. Users can:

- 🖥️ Create VMs through a web interface
- 🔐 Receive a dedicated WireGuard VPN configuration (access only their own VM)
- 🌐 Generate up to 3 free subdomains under `*.smp4.xyz`
- 🚀 Expose services via Cloudflare Tunnel

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js, Express, Prisma ORM |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **Virtualization** | Proxmox VE |
| **VPN** | WireGuard |
| **Tunnel** | Cloudflare Tunnel |
| **Container** | Docker, Docker Compose |

---

## Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/MEHDImp4/smp4-Vm-Manager.git
cd smp4-Vm-Manager

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up -d
```

Access the app at `http://localhost:8090`

---

## Local Development Setup

### Prerequisites

- **Node.js** 18+ 
- **npm** 9+
- **Proxmox VE** server (for VM operations)
- **Cloudflare** account (for tunnel/domains)

### 1. Clone & Install

```bash
git clone https://github.com/MEHDImp4/smp4-Vm-Manager.git
cd smp4-Vm-Manager
```

**Backend:**
```bash
cd backend
npm install
cp .env.example .env   # Configure your environment
npx prisma generate    # Generate Prisma client
npx prisma migrate dev # Run database migrations
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Required
JWT_SECRET=your_secure_random_secret
DATABASE_URL=file:./dev.db

# Proxmox
PROXMOX_URL=https://your-proxmox:8006
PROXMOX_API_TOKEN=user@pam!token=secret
PROXMOX_NODE=pve

# Cloudflare (for domains)
CF_ACCOUNT_ID=your_account_id
CF_API_TOKEN=your_api_token
CF_TUNNEL_ID=your_tunnel_id

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Run Development Servers

**Backend** (port 3000):
```bash
cd backend
npm run dev
```

**Frontend** (port 5173):
```bash
cd frontend
npm run dev
```

Access the app at `http://localhost:5173`

---

## Testing

```bash
# Backend tests with coverage
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

---

## Project Structure

```
smp4-Vm-Manager/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middlewares/     # Auth, validation
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── cron/            # Scheduled jobs
│   ├── prisma/              # Database schema
│   └── __tests__/           # Jest tests
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   └── lib/             # Utilities
│   └── public/              # Static assets
├── vpn/                     # WireGuard service
├── docker-compose.yml
└── .env.example
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login user |
| `GET` | `/api/instances` | List user instances |
| `POST` | `/api/instances` | Create new VM |
| `PUT` | `/api/instances/:id/toggle` | Start/Stop VM |
| `DELETE` | `/api/instances/:id` | Delete VM |
| `POST` | `/api/instances/:id/domains` | Add domain |
| `GET` | `/api/instances/:id/vpn` | Get VPN config |

---

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `backend` | 3000 | Express API |
| `frontend` | 8090 | React SPA (Nginx) |
| `vpn` | 3001 | WireGuard management |
| `tunnel` | - | Cloudflare Tunnel |
| `watchtower` | - | Auto-update containers |

---

## Security Features

- ✅ JWT authentication (no hardcoded secrets)
- ✅ Helmet security headers
- ✅ Rate limiting on auth routes
- ✅ Zod input validation
- ✅ CORS protection
- ✅ Secure VPN command execution (execFile)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.
