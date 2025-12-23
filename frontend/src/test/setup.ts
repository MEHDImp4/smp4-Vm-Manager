// jsdom (in Vitest) does not expose SharedArrayBuffer by default, but some deps
// (whatwg-url → webidl-conversions) expect it. Provide a minimal shim to keep
// their feature detection from throwing during test startup.
// We use a more robust check to ensure it's properly shimmed.
if (typeof globalThis.SharedArrayBuffer === 'undefined' || !globalThis.SharedArrayBuffer.prototype) {
  // @ts-expect-error - assign shim for tests only
  globalThis.SharedArrayBuffer = ArrayBuffer;
}

import '@testing-library/jest-dom';
import { vi } from 'vitest';

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
  observe() { }
  unobserve() { }
  disconnect() { }
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// Mock HTMLCanvasElement.getContext for xterm support
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextType: string) => {
  if (contextType === '2d') {
    return {
      fillStyle: '',
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: [] })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: [] })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
    };
  }
  return null;
});

// Suppress Recharts console warnings about chart dimensions in tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('width(0) and height(0)') ||
      message.includes('chart should be greater than 0') ||
      message.includes('Warning: An update to') && message.includes('inside a test was not wrapped in act'))
  ) {
    return; // Suppress expected test warnings
  }
  originalConsoleError.apply(console, args);
};
