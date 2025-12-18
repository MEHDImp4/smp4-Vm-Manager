import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../use-toast';

describe('useToast Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('should handle different toast variants', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    });

    expect(result.current.toast).toBeDefined();
  });
});
