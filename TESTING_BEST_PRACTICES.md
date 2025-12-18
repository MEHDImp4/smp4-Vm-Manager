# Bonnes Pratiques de Test - SMP4 VM Manager

## 📚 Principes fondamentaux

### 1. Test Pyramid
```
        /\         E2E Tests (10%)
       /  \        Integration Tests (30%)
      /____\       Unit Tests (60%)
```

- **Unitaires (60%)**: Testent les fonctions/méthodes isolées
- **Intégration (30%)**: Testent l'interaction entre composants
- **E2E (10%)**: Testent les flux complets utilisateur

### 2. AAA Pattern (Arrange-Act-Assert)

```javascript
describe('Example Test', () => {
  it('should do something', () => {
    // Arrange - Préparer
    const input = { value: 10 };
    const expected = 20;

    // Act - Exécuter
    const result = double(input.value);

    // Assert - Vérifier
    expect(result).toBe(expected);
  });
});
```

### 3. DRY (Don't Repeat Yourself)

❌ **Mauvais:**
```javascript
describe('Service', () => {
  it('test 1', () => {
    const service = new Service();
    // test...
  });

  it('test 2', () => {
    const service = new Service();
    // test...
  });
});
```

✅ **Bon:**
```javascript
describe('Service', () => {
  let service;

  beforeEach(() => {
    service = new Service();
  });

  it('test 1', () => {
    // test...
  });

  it('test 2', () => {
    // test...
  });
});
```

## 🎯 Backend Best Practices

### 1. Tests de Services

```javascript
// ✅ BON - Isole la logique
describe('UserService', () => {
  it('should calculate user points correctly', () => {
    const user = { level: 5, bonusMultiplier: 1.5 };
    const points = UserService.calculatePoints(user);
    expect(points).toBe(750);
  });
});

// ❌ MAUVAIS - Dépend de la BD
describe('UserService', () => {
  it('should save user points', async () => {
    const user = await db.users.create({ /* ... */ });
    // Couple le test à la BD
  });
});
```

### 2. Mocking des dépendances externes

```javascript
// ✅ BON - Mock les dépendances
jest.mock('axios');
describe('ProxmoxService', () => {
  beforeEach(() => {
    axios.post.mockResolvedValueOnce({ data: { /* ... */ } });
  });

  it('should call API correctly', async () => {
    const result = await service.cloneVM();
    expect(axios.post).toHaveBeenCalledWith(/* ... */);
  });
});
```

### 3. Tests de routes

```javascript
// ✅ BON - Test le contrat API
describe('Instance Routes', () => {
  it('should return 201 on successful creation', async () => {
    const response = await request(app)
      .post('/api/instances')
      .send({ hostname: 'test' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });

  it('should return 400 on invalid input', async () => {
    const response = await request(app)
      .post('/api/instances')
      .send({ /* données invalides */ });

    expect(response.status).toBe(400);
  });
});
```

## 🎨 Frontend Best Practices

### 1. Tests de Composants

```typescript
// ✅ BON - Test le comportement utilisateur
describe('Button', () => {
  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

// ❌ MAUVAIS - Test les détails d'implémentation
describe('Button', () => {
  it('should have className', () => {
    const { container } = render(<Button>Click</Button>);
    expect(container.querySelector('button')).toHaveClass('btn');
  });
});
```

### 2. Tests d'intégration de pages

```typescript
// ✅ BON - Test le flux utilisateur
describe('Dashboard', () => {
  it('should load and display instances', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('test-vm')).toBeInTheDocument();
    });
  });
});
```

### 3. Mocking des appels API

```typescript
// ✅ BON - Mock fetch globalement
beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ instances: [...] })
    })
  );
});

it('should fetch instances', async () => {
  render(<Dashboard />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
});
```

## 🧪 Conseils généraux

### ✅ À faire

1. **Testez le comportement, pas l'implémentation**
   ```javascript
   // ✅ BON
   expect(output).toBe('success');

   // ❌ MAUVAIS
   expect(component.state.isLoading).toBe(false);
   ```

2. **Utilisez des noms descriptifs**
   ```javascript
   // ✅ BON
   it('should create VM and wait for IP address', () => {});

   // ❌ MAUVAIS
   it('creates vm', () => {});
   ```

3. **Testez les cas d'erreur**
   ```javascript
   // ✅ BON
   it('should handle API errors', async () => {
     axios.post.mockRejectedValueOnce(new Error('Failed'));
     expect(await service.create()).rejects.toThrow();
   });
   ```

4. **Groupez les tests logiquement**
   ```javascript
   describe('UserService', () => {
     describe('creation', () => { /* tests */ });
     describe('deletion', () => { /* tests */ });
   });
   ```

### ❌ À éviter

1. **Tests non-déterministes**
   ```javascript
   // ❌ MAUVAIS - Dépend de la time
   it('should receive response', (done) => {
     setTimeout(() => expect(data).toBeDefined(), Math.random() * 1000);
   });
   ```

2. **Tests couplés entre eux**
   ```javascript
   // ❌ MAUVAIS - test 2 dépend de test 1
   it('test 1', () => { globalState.value = 5; });
   it('test 2', () => { expect(globalState.value).toBe(5); });
   ```

3. **Tester l'implémentation plutôt que la fonctionnalité**
   ```javascript
   // ❌ MAUVAIS - Teste les détails internes
   it('should increment counter in state', () => {
     const instance = new Counter();
     instance.increment();
     expect(instance.counter).toBe(1); // Teste l'état interne
   });

   // ✅ BON - Teste le comportement observable
   it('should increase counter display', () => {
     render(<Counter />);
     userEvent.click(screen.getByRole('button'));
     expect(screen.getByText('1')).toBeInTheDocument();
   });
   ```

## 📈 Maintenance des tests

### Refactoring sécurisé avec tests

1. **Les tests donnent confiance**
   - Si les tests passent après un refactoring, c'est correct ✅

2. **Les tests documentent le code**
   - Les tests montrent comment utiliser le code

3. **Les tests préviennent les régressions**
   - Une modification casserait les tests

### Quand mettre à jour les tests

- ✅ Quand vous modifiez le comportement prévu
- ❌ Ne modifiez PAS les tests juste pour qu'ils passent
- ✅ Quand vous découvrez un bug

## 🔍 Code Review - Checklist Tests

Avant de merger une PR:

- [ ] Nouveaux tests pour nouvelles fonctionnalités
- [ ] Tests modifiés/supprimés pour changements
- [ ] Tous les tests passent
- [ ] Couverture >= seuil
- [ ] Pas de tests ignorés (`.skip`, `.only`)
- [ ] Mocking approprié (pas d'appels réels)
- [ ] Pas de `console.log()` ou `debugger` oubliés
- [ ] Noms de tests descriptifs
- [ ] Tests indépendants les uns des autres

## 📚 Ressources utiles

- [Testing Library Best Practices](https://testing-library.com/docs/queries/about/#priority)
- [Jest Best Practices](https://jestjs.io/docs/getting-started)
- [Vitest Best Practices](https://vitest.dev/guide/)
- [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html)
- [AAA Pattern](https://www.thinkster.io/articles/unit-test-aaa-pattern)

## 🎓 Apprentissage continu

1. Lisez les tests existants dans le projet
2. Écrivez des tests pour chaque nouveau code
3. Corrigez les tests qui échouent
4. Participez aux code reviews
5. Apprenez des erreurs et des cas limites

---

**Rappelez-vous**: Les bons tests font le bon code! 🚀
