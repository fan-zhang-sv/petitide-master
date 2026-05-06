import { useState } from 'react';
import { Library } from 'lucide-react';
import type { PlannedPeptide, InjectionLog } from '../../types';
import { CatalogView } from '../catalog/CatalogView';
import { PlannerView } from './PlannerView';

interface PlansViewProps {
  plans: PlannedPeptide[];
  logs: InjectionLog[];
  onArchive: (id: string) => Promise<void>;
  onUpdatePlan: (id: string, patch: Partial<PlannedPeptide>) => Promise<void>;
  onAddPlan: (plan: Omit<PlannedPeptide, 'id' | 'createdAt'>) => Promise<PlannedPeptide>;
}

export function PlansView({
  plans,
  logs,
  onArchive,
  onUpdatePlan,
  onAddPlan,
}: PlansViewProps) {
  const [showCatalog, setShowCatalog] = useState(false);

  if (showCatalog) {
    return (
      <div className="sub-view">
        <header className="sub-header">
          <button type="button" className="ghost-button small" onClick={() => setShowCatalog(false)}>
            ← Back to Plans
          </button>
        </header>
        <CatalogView
          onAddPlan={async (plan) => {
            const newPlan = await onAddPlan(plan);
            setShowCatalog(false);
            return newPlan;
          }}
        />
      </div>
    );
  }

  return (
    <div className="plans-wrapper">
      {plans.length > 0 && (
        <header className="plans-header">
          <button type="button" className="primary-button small" onClick={() => setShowCatalog(true)}>
            <Library aria-hidden />
            Browse Catalog
          </button>
        </header>
      )}
      <PlannerView
        plans={plans}
        logs={logs}
        onArchive={onArchive}
        onUpdatePlan={onUpdatePlan}
        onOpenCatalog={() => setShowCatalog(true)}
      />
    </div>
  );
}
