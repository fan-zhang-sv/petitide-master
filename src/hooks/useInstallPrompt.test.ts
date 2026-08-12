import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useInstallPrompt } from './useInstallPrompt';

describe('useInstallPrompt storage migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it.each(['peptitide', 'petitide'])(
    'moves %s install state to the corrected storage namespace',
    (legacyNamespace) => {
      localStorage.setItem(`${legacyNamespace}:install-prompt:installed`, '1');

      renderHook(() => useInstallPrompt());

      expect(localStorage.getItem('peptide:install-prompt:installed')).toBe('1');
      expect(localStorage.getItem(`${legacyNamespace}:install-prompt:installed`)).toBeNull();
    },
  );

  it.each(['peptitide', 'petitide'])(
    'moves the %s dismissal timestamp to the corrected storage namespace',
    (legacyNamespace) => {
      localStorage.setItem(`${legacyNamespace}:install-prompt:dismissed-at`, '12345');

      renderHook(() => useInstallPrompt());

      expect(localStorage.getItem('peptide:install-prompt:dismissed-at')).toBe('12345');
      expect(localStorage.getItem(`${legacyNamespace}:install-prompt:dismissed-at`)).toBeNull();
    },
  );
});
