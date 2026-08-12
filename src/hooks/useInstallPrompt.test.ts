import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useInstallPrompt } from './useInstallPrompt';

describe('useInstallPrompt storage migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('moves legacy install state to the corrected storage namespace', () => {
    localStorage.setItem('petitide:install-prompt:installed', '1');

    renderHook(() => useInstallPrompt());

    expect(localStorage.getItem('peptitide:install-prompt:installed')).toBe('1');
    expect(localStorage.getItem('petitide:install-prompt:installed')).toBeNull();
  });

  it('moves the legacy dismissal timestamp to the corrected storage namespace', () => {
    localStorage.setItem('petitide:install-prompt:dismissed-at', '12345');

    renderHook(() => useInstallPrompt());

    expect(localStorage.getItem('peptitide:install-prompt:dismissed-at')).toBe('12345');
    expect(localStorage.getItem('petitide:install-prompt:dismissed-at')).toBeNull();
  });
});
