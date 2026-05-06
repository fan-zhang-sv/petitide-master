import { describe, expect, it } from 'vitest'
import { calculateReconstitution } from './reconstitution'

describe('calculateReconstitution', () => {
  it('converts vial and dose units into concentration, draw, units, and doses', () => {
    const result = calculateReconstitution({
      vialAmount: 5,
      vialUnit: 'mg',
      bacWaterMl: 2,
      targetDose: 250,
      targetUnit: 'mcg',
      syringeUnitsPerMl: 10,
      dosesAlreadyUsed: 2,
    })

    expect(result.vialAmountMcg).toBe(5000)
    expect(result.concentrationMcgPerMl).toBe(2500)
    expect(result.drawMl).toBe(0.1)
    expect(result.syringeUnits).toBe(10)
    expect(result.dosesPerVial).toBe(20)
    expect(result.remainingDoses).toBe(18)
    expect(result.warnings).toEqual([])
  })

  it('matches common U-100 syringe math for 20 mg in 4 mL at 500 mcg', () => {
    const result = calculateReconstitution({
      vialAmount: 20,
      vialUnit: 'mg',
      bacWaterMl: 4,
      targetDose: 500,
      targetUnit: 'mcg',
      syringeUnitsPerMl: 10,
    })

    expect(result.concentrationMcgPerMl).toBe(5000)
    expect(result.drawMl).toBe(0.1)
    expect(result.syringeUnits).toBe(10)
    expect(result.dosesPerVial).toBe(40)
  })

  it('warns on impossible values and oversized target doses', () => {
    const result = calculateReconstitution({
      vialAmount: 1,
      vialUnit: 'mg',
      bacWaterMl: 0,
      targetDose: 2,
      targetUnit: 'mg',
      syringeUnitsPerMl: 10,
    })

    expect(result.warnings).toContain('Bacteriostatic water must be greater than zero.')
    expect(result.warnings).toContain('Target dose is larger than the vial amount.')
  })
})
