# Guide de Contribution - Tests

Ce document explique comment exécuter et écrire des tests pour le projet SMP4 VM Manager.

## 📋 Vue d'ensemble

Le projet utilise:
- **Backend**: Jest + Supertest
- **Frontend**: Vitest + React Testing Library
- **VPN Service**: Jest + Supertest
- **CI/CD**: GitHub Actions

## 🚀 Installation

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

### VPN Service

```bash
cd vpn
npm install
```

## 🧪 Exécution des tests

### Backend

```bash
# Tous les tests avec couverture
cd backend
npm test

# Mode watch
npm run test:watch

# Tests unitaires uniquement
npm run test:unit

# Tests d'intégration uniquement
npm run test:integration
```

### Frontend

```bash
# Tous les tests
cd frontend
npm test

# Avec interface utilisateur
npm run test:ui

# Avec couverture
npm run test:coverage
```

### VPN Service

```bash
cd vpn
npm test
npm run test:watch
```

## 📁 Structure des tests

### Backend

```
backend/
├── __tests__/
│   ├── unit/
│   │   ├── proxmox.service.test.js
│   │   ├── vpn.service.test.js
│   │   ├── cloudflare.service.test.js
│   │   ├── pointsService.test.js
│   │   └── consumptionCron.test.js
│   └── integration/
│       ├── auth.routes.test.js
│       └── instance.routes.test.js
├── jest.config.js
├── jest.setup.js
└── package.json
```

### Frontend

```
frontend/
├── src/
│   ├── test/
│   │   ├── setup.ts
│   │   └── test-utils.tsx
│   ├── pages/
│   │   └── __tests__/
│   │       ├── Auth.test.tsx
│   │       └── Dashboard.test.tsx
│   ├── components/
│   │   └── ui/
│   │       └── __tests__/
│   │           └── button.test.tsx
│   └── hooks/
│       └── __tests__/
│           └── use-toast.test.ts
├── vitest.config.ts
└── package.json
```

### VPN Service

```
vpn/
├── __tests__/
│   └── vpn.service.test.js
├── jest.config.js
└── package.json
```

## ✍️ Écrire des tests

### Tests Backend - Exemple de Service

```javascript
jest.mock('axios');
const axios = require('axios');
const ProxmoxService = require('../../src/services/proxmox.service');

describe('ProxmoxService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProxmoxService();
  });

  describe('getLXCList', () => {
    it('should return list of LXC containers', async () => {
      const mockData = [
        { vmid: 100, hostname: 'vm1', status: 'running' }
      ];

      axios.create().get.mockResolvedValueOnce({ data: { data: mockData } });
      const result = await service.getLXCList();
      expect(result).toEqual(mockData);
    });
  });
});
```

### Tests Backend - Exemple de Route

```javascript
const request = require('supertest');
const app = require('../../src/index');

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user.token');
    });
  });
});
```

### Tests Frontend - Exemple de Composant

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '../test-utils';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeTruthy();
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Tests Frontend - Exemple de Hook

```typescript
import { renderHook, act } from '@testing-library/react';
import { useToast } from './use-toast';

describe('useToast Hook', () => {
  it('should provide toast function', () => {
    const { result } = renderHook(() => useToast());
    expect(typeof result.current.toast).toBe('function');
  });

  it('should handle toast with title', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Success',
        description: 'Operation completed',
      });
    });

    expect(result.current.toast).toBeDefined();
  });
});
```

## 📊 Couverture des tests

Les seuils de couverture sont configurés comme suit:

- **Backend**: 50% (branches, functions, lines, statements)
- **Frontend**: 50% (branches, functions, lines, statements)
- **VPN**: 40% (branches, functions, lines, statements)

Pour vérifier la couverture:

```bash
# Backend
cd backend
npm test -- --coverage

# Frontend
cd frontend
npm run test:coverage
```

## 🔄 Mocking des dépendances externes

### Mocking des appels HTTP (Backend)

```javascript
jest.mock('axios');
const axios = require('axios');

axios.post.mockResolvedValueOnce({ data: { /* ... */ } });
```

### Mocking de Prisma (Backend)

```javascript
jest.mock('../../src/db');
const { prisma } = require('../../src/db');

prisma.user.findUnique.mockResolvedValueOnce({ /* mock data */ });
```

### Mocking des hooks React (Frontend)

```typescript
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/dashboard' }),
}));
```

## 🐛 Débogage des tests

### Backend

```bash
# Mode debug
node --inspect-brk node_modules/.bin/jest --runInBand

# Puis ouvrir chrome://inspect
```

### Frontend

```bash
# Interface Vitest avec debug
npm run test:ui
```

## ✅ Checklist avant commit

- [ ] Tous les tests passent localement
- [ ] Couverture >= seuils configurés
- [ ] Pas de warnings ESLint
- [ ] Tests nouveaux ajoutés pour nouvelles fonctionnalités
- [ ] Tests mis à jour pour les modifications existantes

## 🔗 Ressources

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest](https://github.com/visionmedia/supertest)

## 📝 Conventions de nommage

- Fichiers de test: `*.test.js` ou `*.test.tsx`
- Dossiers: `__tests__` ou `__tests__/{unit|integration}`
- Describe blocks: Nom du composant/service/route
- It blocks: Description du comportement attendu

## 🆘 Aide

Pour des questions sur les tests, consultez:
1. Les tests existants dans chaque dossier `__tests__`
2. La documentation officielle des outils
3. Les directives du projet dans `.github/copilot-instructions.md`
