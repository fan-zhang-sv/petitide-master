import type { PlannedPeptide, ReconstitutionInput, ReconstitutionResult } from '../../types';
import { calculateReconstitution } from '../../utils/reconstitution';

export const defaultDoseMathInput: ReconstitutionInput = {
  vialAmount: 5,
  vialUnit: 'mg',
  bacWaterMl: 2,
  targetDose: 250,
  targetUnit: 'mcg',
  syringeUnitsPerMl: 10,
  dosesAlreadyUsed: 0,
};

export function getDoseMathResult(input: ReconstitutionInput) {
  return calculateReconstitution(input);
}

export function doseMathTargetDoseLabel(input: ReconstitutionInput) {
  return `${input.targetDose} ${input.targetUnit}`;
}

export function buildDoseMathPatch({
  calculatorEnabled,
  currentDose,
  input,
  result,
  confirmDoseSync,
}: {
  calculatorEnabled: boolean;
  currentDose: string;
  input: ReconstitutionInput;
  result: ReconstitutionResult;
  confirmDoseSync: (targetDose: string, currentDose: string) => boolean;
}): Pick<Partial<PlannedPeptide>, 'dose' | 'calculator'> {
  if (!calculatorEnabled || result.warnings.length > 0) {
    return {};
  }

  const patch: Pick<Partial<PlannedPeptide>, 'dose' | 'calculator'> = {
    calculator: result,
  };
  const targetDose = doseMathTargetDoseLabel(input);

  if (targetDose !== currentDose.trim() && confirmDoseSync(targetDose, currentDose)) {
    patch.dose = targetDose;
  }

  return patch;
}
