import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// jsdom implements no layout, so `scrollIntoView` is simply absent from its
// Element prototype. Anything that keeps a highlighted row in view (Select's
// listbox, for one) calls it. Stub it here rather than guarding the call in
// production code for the benefit of the test environment.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Mock localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
};

global.localStorage = createLocalStorageMock() as unknown as Storage;
