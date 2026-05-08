import { describe, expect, it, vi } from 'vitest';
import { calculateReconstitution } from '../../utils/reconstitution';
import { buildDoseMathPatch, defaultDoseMathInput } from './planDoseMath';

describe('buildDoseMathPatch', () => {
  it('copies the target dose when the user accepts the prompt', () => {
    const input = { ...defaultDoseMathInput, targetDose: 500, targetUnit: 'mcg' as const };
    const result = calculateReconstitution(input);
    const confirmDoseSync = vi.fn(() => true);

    const patch = buildDoseMathPatch({
      calculatorEnabled: true,
      currentDose: '250 mcg',
      input,
      result,
      confirmDoseSync,
    });

    expect(patch.dose).toBe('500 mcg');
    expect(patch.calculator).toBe(result);
    expect(confirmDoseSync).toHaveBeenCalledWith('500 mcg', '250 mcg');
  });

  it('keeps the current dose when the user declines the prompt', () => {
    const input = { ...defaultDoseMathInput, targetDose: 500, targetUnit: 'mcg' as const };
    const result = calculateReconstitution(input);
    const confirmDoseSync = vi.fn(() => false);

    const patch = buildDoseMathPatch({
      calculatorEnabled: true,
      currentDose: '250 mcg',
      input,
      result,
      confirmDoseSync,
    });

    expect(patch.dose).toBeUndefined();
    expect(patch.calculator).toBe(result);
    expect(confirmDoseSync).toHaveBeenCalledWith('500 mcg', '250 mcg');
  });

  it('does not attach invalid calculator results', () => {
    const input = { ...defaultDoseMathInput, bacWaterMl: 0 };
    const result = calculateReconstitution(input);
    const confirmDoseSync = vi.fn(() => true);

    const patch = buildDoseMathPatch({
      calculatorEnabled: true,
      currentDose: '250 mcg',
      input,
      result,
      confirmDoseSync,
    });

    expect(patch).toEqual({});
    expect(confirmDoseSync).not.toHaveBeenCalled();
  });
});
