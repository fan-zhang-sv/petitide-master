import { useState } from 'react';
import { Library, Plus } from 'lucide-react';
import type { PlannedPeptide, InjectionLog } from '../../types';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/Header';
import { SubView } from '../../components/ui/SubView';
import { CatalogView } from '../catalog/CatalogView';
import { PlannerView } from './PlannerView';
import styles from '../../styles/app.module.css';

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
      <SubView backLabel="← Back to Plans" onBack={() => setShowCatalog(false)}>
        <CatalogView
          onAddPlan={async (plan) => {
            const newPlan = await onAddPlan(plan);
            setShowCatalog(false);
            return newPlan;
          }}
        />
      </SubView>
    );
  }

  return (
    <div className={styles['plans-wrapper']}>
      <PageHeader
        variant="plans"
        title="Plans"
        meta={`${plans.length} active`}
        actions={(
          <Button variant="primary" size="small" onClick={() => setShowCatalog(true)}>
            {plans.length > 0 ? <Library aria-hidden /> : <Plus aria-hidden />}
            {plans.length > 0 ? 'Catalog' : 'Browse catalog'}
          </Button>
        )}
      />
      <PlannerView
        plans={plans}
        logs={logs}
        onArchive={onArchive}
        onUpdatePlan={onUpdatePlan}
      />
    </div>
  );
}
