# 🧪 Tests - SMP4 VM Manager

> Implémentation complète d'une suite de tests pour le projet SMP4 VM Manager

## 📋 Vue d'ensemble

Ce projet contient une suite de tests **complète et production-ready** avec:

- ✅ **70+ tests** couvrant tous les services
- ✅ **CI/CD automation** avec GitHub Actions
- ✅ **3 frameworks** (Jest, Vitest, Supertest)
- ✅ **Documentation complète** pour les contributeurs
- ✅ **Bonnes pratiques** de test intégrées

## 🚀 Démarrage rapide

### 1. Installation des dépendances

```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# VPN Service
cd vpn && npm install && cd ..
```

### 2. Exécution des tests

```bash
# Tous les tests
./run-tests.sh all

# Ou individuellement
npm test              # backend
cd frontend && npm test  # frontend
cd vpn && npm test       # vpn
```

### 3. Vérifier la couverture

```bash
./run-tests.sh coverage
```

## 📁 Structure des fichiers

```
smp4-Vm-Manager/
├── backend/
│   ├── __tests__/
│   │   ├── unit/              # Tests unitaires des services
│   │   └── integration/       # Tests des routes
│   ├── jest.config.js
│   ├── jest.setup.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── test/
│   │   │   ├── setup.ts       # Mocks et configuration
│   │   │   └── test-utils.tsx # Utilitaires de test
│   │   ├── pages/__tests__/   # Tests des pages
│   │   ├── components/ui/__tests__/
│   │   └── hooks/__tests__/
│   ├── vitest.config.ts
│   └── package.json
├── vpn/
│   ├── __tests__/
│   ├── jest.config.js
│   └── package.json
├── .github/workflows/
│   ├── tests.yml              # Pipeline tests
│   └── code-quality.yml       # ESLint + audit
├── TESTING.md                 # Guide complet
├── TESTING_BEST_PRACTICES.md  # Bonnes pratiques
├── TEST_IMPLEMENTATION_SUMMARY.md  # Résumé de l'implémentation
└── run-tests.sh              # Script de démarrage
```

## 🧪 Tests par section

### Backend (42 tests)

#### Unitaires
- `proxmox.service.test.js` - 6 tests
- `vpn.service.test.js` - 4 tests
- `cloudflare.service.test.js` - 4 tests
- `pointsService.test.js` - 3 tests
- `consumptionCron.test.js` - 2 tests
- `snapshotCron.test.js` - 4 tests
- `authMiddleware.test.js` - 4 tests

#### Intégration
- `auth.routes.test.js` - 4 tests
- `instance.routes.test.js` - 5 tests
- `template.routes.test.js` - 3 tests
- `points.routes.test.js` - 3 tests

### Frontend (25 tests)

- `Auth.test.tsx` - 5 tests
- `Dashboard.test.tsx` - 4 tests
- `CreateInstance.test.tsx` - 4 tests
- `InstanceDetails.test.tsx` - 5 tests
- `button.test.tsx` - 4 tests
- `use-toast.test.ts` - 3 tests

### VPN Service (3 tests)

- `vpn.service.test.js` - 3 tests

## 📊 Couverture

| Partie | Cible | Status |
|--------|-------|--------|
| Backend | 50% | ✅ |
| Frontend | 50% | ✅ |
| VPN | 40% | ✅ |

## 🔄 CI/CD Pipeline

Les workflows GitHub Actions exécutent automatiquement:

1. **Tests** (`.github/workflows/tests.yml`)
   - Backend tests
   - Frontend tests
   - VPN tests
   - Upload coverage vers Codecov

2. **Quality Checks** (`.github/workflows/code-quality.yml`)
   - ESLint
   - Code coverage
   - Security audit

## 📖 Documentation

- **[TESTING.md](./TESTING.md)** - Guide complet pour exécuter et écrire les tests
- **[TESTING_BEST_PRACTICES.md](./TESTING_BEST_PRACTICES.md)** - Bonnes pratiques détaillées
- **[TEST_IMPLEMENTATION_SUMMARY.md](./TEST_IMPLEMENTATION_SUMMARY.md)** - Résumé de l'implémentation

## 🛠️ Commandes disponibles

### Backend
```bash
cd backend
npm test                    # Tests avec couverture
npm run test:watch        # Mode watch
npm run test:unit         # Unitaires uniquement
npm run test:integration  # Intégration uniquement
```

### Frontend
```bash
cd frontend
npm test                   # Tests
npm run test:ui           # Avec UI
npm run test:coverage     # Avec couverture
```

### VPN
```bash
cd vpn
npm test                  # Tests
npm run test:watch      # Mode watch
```

## ✍️ Ajouter des tests

### Backend - Service

```javascript
jest.mock('axios');
const axios = require('axios');
const MyService = require('../../src/services/my.service');

describe('MyService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MyService();
  });

  it('should do something', async () => {
    axios.get.mockResolvedValueOnce({ data: { /* ... */ } });
    const result = await service.getData();
    expect(result).toBeDefined();
  });
});
```

### Frontend - Composant

```typescript
import { render, screen } from '../test-utils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText(/text/i)).toBeInTheDocument();
  });
});
```

## 🔍 Bonnes pratiques

### ✅ À faire
- Testez le **comportement**, pas l'implémentation
- Utilisez des **noms descriptifs**
- Testez les **cas d'erreur**
- Groupez les tests **logiquement**

### ❌ À éviter
- Tests **non-déterministes**
- Tests **couplés** entre eux
- Tester les détails **internes**
- Oublier de **nettoyer** les mocks

## 📈 Prochaines étapes

1. ✅ Augmenter la couverture > 80%
2. ✅ Ajouter des tests E2E (Playwright/Cypress)
3. ✅ Configurer les badges de couverture
4. ✅ Bloquer les MR si tests échouent
5. ✅ Ajouter des tests de performance

## 🤝 Contribution

Avant de commit:
- [ ] Tous les tests passent localement
- [ ] Couverture >= seuils
- [ ] Pas de warnings ESLint
- [ ] Tests ajoutés/modifiés pour vos changements

```bash
# Vérifier avant commit
npm test            # Backend
cd frontend && npm test  # Frontend
cd vpn && npm test       # VPN
```

## 📞 Support

Pour des questions:
1. Consultez [TESTING.md](./TESTING.md)
2. Regardez les tests existants
3. Lisez les docs officielles:
   - [Jest](https://jestjs.io/)
   - [Vitest](https://vitest.dev/)
   - [React Testing Library](https://testing-library.com/react)

## 📝 Changelog

### 🎉 v1.0.0 - Implémentation complète
- ✅ 70+ tests implémentés
- ✅ Configuration Jest complète (backend)
- ✅ Configuration Vitest complète (frontend)
- ✅ GitHub Actions CI/CD
- ✅ Documentation complète
- ✅ Bonnes pratiques documentées

---

**Faites de bons tests, écrivez du bon code! 🚀**
