import type { ReconstitutionInput, ReconstitutionResult } from '../types'

const toMcg = (amount: number, unit: 'mg' | 'mcg') => (unit === 'mg' ? amount * 1000 : amount)

export function calculateReconstitution(input: ReconstitutionInput): ReconstitutionResult {
  const warnings: string[] = []
  const vialAmountMcg = toMcg(input.vialAmount, input.vialUnit)
  const targetDoseMcg = toMcg(input.targetDose, input.targetUnit)

  if (!Number.isFinite(vialAmountMcg) || vialAmountMcg <= 0) {
    warnings.push('Vial amount must be greater than zero.')
  }
  if (!Number.isFinite(input.bacWaterMl) || input.bacWaterMl <= 0) {
    warnings.push('Bacteriostatic water must be greater than zero.')
  }
  if (!Number.isFinite(targetDoseMcg) || targetDoseMcg <= 0) {
    warnings.push('Target dose must be greater than zero.')
  }
  if (!Number.isFinite(input.syringeUnitsPerMl) || input.syringeUnitsPerMl <= 0) {
    warnings.push('Syringe units per 0.1 mL must be greater than zero.')
  }
  if (targetDoseMcg > vialAmountMcg && vialAmountMcg > 0) {
    warnings.push('Target dose is larger than the vial amount.')
  }

  const concentrationMcgPerMl =
    vialAmountMcg > 0 && input.bacWaterMl > 0 ? vialAmountMcg / input.bacWaterMl : 0
  const drawMl =
    concentrationMcgPerMl > 0 && targetDoseMcg > 0 ? targetDoseMcg / concentrationMcgPerMl : 0
  const syringeUnits = drawMl * 10 * Math.max(0, input.syringeUnitsPerMl)
  const dosesPerVial = targetDoseMcg > 0 ? Math.floor(vialAmountMcg / targetDoseMcg) : 0
  const remainingDoses = Math.max(0, dosesPerVial - Math.max(0, input.dosesAlreadyUsed ?? 0))

  if (drawMl > 1) {
    warnings.push('Draw volume is over 1 mL. Confirm syringe size and concentration.')
  }
  if (syringeUnits > 100) {
    warnings.push('Draw is over 100 insulin syringe units. Confirm syringe scale.')
  }

  return {
    vialAmountMcg,
    targetDoseMcg,
    concentrationMcgPerMl,
    drawMl,
    syringeUnits,
    dosesPerVial,
    remainingDoses,
    warnings,
  }
}

export function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) {
    return '0'
  }
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: value % 1 === 0 ? 0 : Math.min(2, digits),
  })
}
