import { useState, type ChangeEvent } from 'react';
import { FlaskConical } from 'lucide-react';
import type { PlannedPeptide, ReconstitutionInput } from '../../types';
import { calculateReconstitution, formatNumber } from '../../utils/reconstitution';
import { FormGrid } from '../../components/ui/FormGrid';
import { Metric } from '../../components/ui/Metric';

interface DoseMathViewProps {
  plans: PlannedPeptide[];
  onUpdatePlan: (id: string, patch: Partial<PlannedPeptide>) => Promise<void>;
}

export function DoseMathView({ plans, onUpdatePlan }: DoseMathViewProps) {
  const [input, setInput] = useState<ReconstitutionInput>({
    vialAmount: 5,
    vialUnit: 'mg',
    bacWaterMl: 2,
    targetDose: 250,
    targetUnit: 'mcg',
    syringeUnitsPerMl: 10,
    dosesAlreadyUsed: 0,
  });
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const result = calculateReconstitution(input);

  const setNumber = (key: keyof ReconstitutionInput) => (event: ChangeEvent<HTMLInputElement>) => {
    setInput((current) => ({ ...current, [key]: Number(event.target.value) }));
  };

  return (
    <section className="screen calc-layout">
      <form className="tool-panel" onSubmit={(event) => event.preventDefault()}>
        <div className="section-heading">
          <h2>Reconstitution</h2>
          <span>No dosing recommendations</span>
        </div>
        <FormGrid>
          <label>
            Vial amount
            <input type="number" min="0" step="0.01" value={input.vialAmount} onChange={setNumber('vialAmount')} />
          </label>
          <label>
            Vial unit
            <select
              value={input.vialUnit}
              onChange={(event) => setInput((current) => ({ ...current, vialUnit: event.target.value as 'mg' | 'mcg' }))}
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
            Target dose
            <input type="number" min="0" step="0.01" value={input.targetDose} onChange={setNumber('targetDose')} />
          </label>
          <label>
            Target unit
            <select
              value={input.targetUnit}
              onChange={(event) =>
                setInput((current) => ({ ...current, targetUnit: event.target.value as 'mg' | 'mcg' }))
              }
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
      </form>

      <aside className="result-panel">
        <div className="metric-grid">
          <Metric label="Concentration" value={`${formatNumber(result.concentrationMcgPerMl)} mcg/mL`} tone="cool" />
          <Metric label="Draw" value={`${formatNumber(result.drawMl, 3)} mL`} tone="warm" />
          <Metric label="Syringe" value={`${formatNumber(result.syringeUnits)} units`} tone="cool" />
          <Metric label="Doses left" value={result.remainingDoses} tone="warm" />
        </div>
        {result.warnings.length > 0 && (
          <div className="notice warning">
            {result.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}
        <label>
          Attach to plan
          <select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
            <option value="">Choose active plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="primary-button"
          disabled={!selectedPlanId || result.warnings.length > 0}
          onClick={() =>
            void onUpdatePlan(selectedPlanId, {
              calculator: result,
              dose: `${input.targetDose} ${input.targetUnit}`,
            })
          }
        >
          <FlaskConical aria-hidden />
          Attach calculation
        </button>
      </aside>
    </section>
  );
}
