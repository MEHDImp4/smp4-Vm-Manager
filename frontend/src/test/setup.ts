import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom (in Vitest) does not expose SharedArrayBuffer by default, but some deps
// (whatwg-url → webidl-conversions) expect it. Provide a minimal shim to keep
// their feature detection from throwing during test startup.
if (!('SharedArrayBuffer' in globalThis)) {
  // @ts-expect-error - assign shim for tests only
  globalThis.SharedArrayBuffer = ArrayBuffer;
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock API responses
global.fetch = vi.fn();

// Polyfill ResizeObserver for components using responsive charts (e.g., recharts)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error - assign to window for jsdom
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
