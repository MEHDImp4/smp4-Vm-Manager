# SMP4 VM Manager - Architecture (C4 Model)

## Level 1: System Context

```mermaid
C4Context
    title System Context - SMP4 VM Manager

    Person(user, "Utilisateur", "Gère ses VMs Linux")
    Person(admin, "Administrateur", "Supervise la plateforme")

    System(smp4, "SMP4 VM Manager", "Plateforme de gestion de VMs Linux containerisées")

    System_Ext(proxmox, "Proxmox VE", "Hyperviseur LXC")
    System_Ext(cloudflare, "Cloudflare Tunnel", "Reverse proxy/DNS")
    System_Ext(wireguard, "WireGuard VPN", "Accès sécurisé")
    System_Ext(smtp, "SMTP Server", "Emails transactionnels")

    Rel(user, smp4, "Utilise", "HTTPS")
    Rel(admin, smp4, "Administre", "HTTPS")
    Rel(smp4, proxmox, "Provisionne VMs", "REST API")
    Rel(smp4, cloudflare, "Gère DNS/Tunnels", "REST API")
    Rel(smp4, wireguard, "Crée clients VPN", "REST API")
    Rel(smp4, smtp, "Envoie emails", "SMTP")
```

---

## Level 2: Container Diagram

```mermaid
C4Container
    title Container Diagram - SMP4 VM Manager

    Person(user, "Utilisateur")

    Container_Boundary(c1, "SMP4 Platform") {
        Container(frontend, "Frontend", "React/Vite", "SPA avec Dashboard")
        Container(backend, "Backend API", "Node.js/Express", "REST API + WebSocket")
        Container(vpn_svc, "VPN Service", "Node.js", "Gestion WireGuard")
        ContainerDb(postgres, "Database", "PostgreSQL", "Users, Instances, Domains")
    }

    System_Ext(proxmox, "Proxmox VE")
    System_Ext(cloudflare, "Cloudflare")

    Rel(user, frontend, "Navigue", "HTTPS")
    Rel(frontend, backend, "API Calls", "REST/WS")
    Rel(backend, postgres, "CRUD", "Prisma")
    Rel(backend, proxmox, "VM Ops", "REST")
    Rel(backend, cloudflare, "DNS Ops", "REST")
    Rel(backend, vpn_svc, "VPN Ops", "HTTP")
```

---

## Level 3: Component Diagram (Backend)

```mermaid
C4Component
    title Component Diagram - Backend

    Container_Boundary(api, "Backend API") {
        Component(routes, "Routes", "Express Router", "Endpoints HTTP")
        Component(controllers, "Controllers", "JS", "Logique requêtes")
        Component(services, "Services", "JS", "Logique métier")
        Component(middleware, "Middleware", "JS", "Auth, Validation")
        Component(cron, "Cron Jobs", "node-cron", "Tâches planifiées")
        Component(circuit, "Circuit Breaker", "opossum", "Résilience")
    }

    ContainerDb(db, "PostgreSQL")
    System_Ext(proxmox, "Proxmox")
    System_Ext(cf, "Cloudflare")

    Rel(routes, middleware, "Uses")
    Rel(routes, controllers, "Calls")
    Rel(controllers, services, "Calls")
    Rel(services, circuit, "Wrapped by")
    Rel(circuit, proxmox, "Calls")
    Rel(circuit, cf, "Calls")
    Rel(services, db, "Queries")
    Rel(cron, services, "Uses")
```

---

## Services Architecture

| Service | Responsabilité | Dépendances |
|---------|---------------|-------------|
| `proxmox.service` | Opérations VM (start/stop/clone) | Proxmox API |
| `cloudflare.service` | Gestion tunnels/DNS | Cloudflare API |
| `vpn.service` | Clients WireGuard | VPN Service |
| `email.service` | Notifications | SMTP |
| `domain.service` | Sous-domaines | Cloudflare, DB |
| `instance.service` | Logique VM | Proxmox, DB |
| `ssh.service` | Terminal WebSocket | SSH |

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant CB as CircuitBreaker
    participant P as Proxmox

    U->>F: Create VM
    F->>B: POST /instances
    B->>CB: proxmox.cloneLXC()
    CB->>P: Clone Template
    P-->>CB: Task UPID
    CB-->>B: Success
    B->>B: Save to DB
    B-->>F: Instance Created
    F-->>U: Show VM
```
