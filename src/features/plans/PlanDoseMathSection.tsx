import type { ChangeEvent } from 'react';
import type { ReconstitutionInput, ReconstitutionResult } from '../../types';
import { FormGrid, Metric, SectionHeader } from '../../components/ui';
import { formatNumber } from '../../utils/reconstitution';
import { getDoseMathResult } from './planDoseMath';
import styles from '../../styles/app.module.css';
import { cx } from '../../utils/ui/classNames';

interface PlanDoseMathSectionProps {
  input: ReconstitutionInput;
  open: boolean;
  existingResult?: ReconstitutionResult;
  onChange: (input: ReconstitutionInput) => void;
  onOpenChange: (open: boolean) => void;
}

export function PlanDoseMathSection({
  input,
  open,
  existingResult,
  onChange,
  onOpenChange,
}: PlanDoseMathSectionProps) {
  const result = getDoseMathResult(input);
  const setNumber = (key: keyof ReconstitutionInput) => (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...input, [key]: Number(event.target.value) });
  };

  return (
    <details
      className={styles['expert-panel']}
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary>Advanced dose math</summary>
      {existingResult && (
        <div className={styles['calc-summary']}>
          Saved: {formatNumber(existingResult.syringeUnits)} units / {formatNumber(existingResult.drawMl, 3)} mL
        </div>
      )}
      <SectionHeader title="Reconstitution" meta="No dosing recommendations" />
      <FormGrid>
        <label>
          Vial amount
          <input type="number" min="0" step="0.01" value={input.vialAmount} onChange={setNumber('vialAmount')} />
        </label>
        <label>
          Vial unit
          <select
            value={input.vialUnit}
            onChange={(event) => onChange({ ...input, vialUnit: event.target.value as 'mg' | 'mcg' })}
          >
            <option value="mg">mg</option>
            <option value="mcg">mcg</option>
          </select>
        </label>
        <label>
          Bac water mL
          <input type="number" min="0" step="0.1" value={input.bacWaterMl} onChange={setNumber('bacWaterMl')} />
        </label>
        <label>
          Calculator target dose
          <input type="number" min="0" step="0.01" value={input.targetDose} onChange={setNumber('targetDose')} />
        </label>
        <label>
          Calculator target unit
          <select
            value={input.targetUnit}
            onChange={(event) => onChange({ ...input, targetUnit: event.target.value as 'mg' | 'mcg' })}
          >
            <option value="mcg">mcg</option>
            <option value="mg">mg</option>
          </select>
        </label>
        <label>
          Syringe units per 0.1 mL
          <input
            type="number"
            min="1"
            step="1"
            value={input.syringeUnitsPerMl}
            onChange={setNumber('syringeUnitsPerMl')}
          />
        </label>
        <label>
          Doses already used
          <input
            type="number"
            min="0"
            step="1"
            value={input.dosesAlreadyUsed}
            onChange={setNumber('dosesAlreadyUsed')}
          />
        </label>
      </FormGrid>
      <div className={styles['metric-grid']}>
        <Metric label="Concentration" value={`${formatNumber(result.concentrationMcgPerMl)} mcg/mL`} tone="cool" />
        <Metric label="Draw" value={`${formatNumber(result.drawMl, 3)} mL`} tone="warm" />
        <Metric label="Syringe" value={`${formatNumber(result.syringeUnits)} units`} tone="cool" />
        <Metric label="Doses left" value={result.remainingDoses} tone="warm" />
      </div>
      {result.warnings.length > 0 && (
        <div className={cx(styles.notice, styles.warning)}>
          {result.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
          <p>Plan changes can still be saved, but this calculator result will not be attached.</p>
        </div>
      )}
    </details>
  );
}
