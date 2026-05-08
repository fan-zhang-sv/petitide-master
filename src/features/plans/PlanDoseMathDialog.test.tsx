import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { protocolCatalog } from '../../data/protocolCatalog';
import type { PlannedPeptide } from '../../types';
import { PlanDialog } from '../catalog/PlanDialog';
import { PlanEditDialog } from './PlanEditDialog';

const basePlan: PlannedPeptide = {
  id: 'plan-1',
  templateId: 'bpc-157',
  name: 'BPC-157',
  route: 'subcutaneous',
  dose: '250 mcg',
  frequency: { kind: 'daily' },
  startDate: '2026-05-07',
  reminderTime: '08:00',
  injectionSites: ['Abdomen L'],
  notes: '',
  createdAt: '2026-05-07T00:00:00.000Z',
};

describe('plan-scoped dose math dialogs', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves calculator output during plan creation without changing dose when declined', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <PlanDialog
        template={protocolCatalog[0]}
        onClose={vi.fn()}
        onAdd={onAdd}
      />,
    );

    await user.click(screen.getByText('Advanced dose math'));
    await user.clear(screen.getByLabelText(/calculator target dose/i));
    await user.type(screen.getByLabelText(/calculator target dose/i), '500');
    await user.click(screen.getByRole('button', { name: /save plan/i }));

    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    const savedPlan = onAdd.mock.calls[0][0] as PlannedPeptide;
    expect(savedPlan.dose).toBe(protocolCatalog[0].typicalDose);
    expect(savedPlan.calculator?.syringeUnits).toBe(20);
    expect(window.confirm).toHaveBeenCalled();
  });

  it('saves calculator output and updates dose during plan editing when accepted', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <PlanEditDialog
        plan={basePlan}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByText('Advanced dose math'));
    await user.clear(screen.getByLabelText(/calculator target dose/i));
    await user.type(screen.getByLabelText(/calculator target dose/i), '500');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const patch = onSave.mock.calls[0][0] as Partial<PlannedPeptide>;
    expect(patch.dose).toBe('500 mcg');
    expect(patch.calculator?.syringeUnits).toBe(20);
    expect(window.confirm).toHaveBeenCalledWith('Update plan dose from 250 mcg to 500 mcg?');
  });
});
