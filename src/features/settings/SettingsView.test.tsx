import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importPlannerData, exportPlannerData } from '../../db/database';
import type { AppSettings } from '../../types';
import { SettingsView } from './SettingsView';

vi.mock('../../db/database', () => ({
  exportPlannerData: vi.fn(),
  importPlannerData: vi.fn(),
  clearPlannerData: vi.fn(),
}));

vi.mock('./AccountCard', () => ({
  AccountCard: () => <div>Account</div>,
}));

const settings: AppSettings = {
  id: 'settings',
  onboardingAccepted: true,
  preferredDoseUnit: 'mcg',
  notificationPermissionAsked: false,
  updatedAt: '2026-05-21T00:00:00.000Z',
};

describe('SettingsView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:backup'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('downloads exported planner data as a JSON backup', async () => {
    const backup = {
      version: 1,
      exportedAt: '2026-05-21T00:00:00.000Z',
      plans: [],
      logs: [],
      settings,
    };
    let clickedDownload = '';
    let clickedHref = '';
    vi.mocked(exportPlannerData).mockResolvedValue(backup);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedDownload = this.download;
      clickedHref = this.href;
    });

    render(
      <SettingsView
        settings={settings}
        onSaveSettings={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /export backup/i }));

    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled());
    expect(exportPlannerData).toHaveBeenCalledTimes(1);
    expect(clickedDownload).toMatch(/^peptitide-master-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(clickedHref).toBe('blob:backup');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:backup');

    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json');
    await expect(blob.text()).resolves.toBe(JSON.stringify(backup, null, 2));
  });

  it('parses imported backup JSON before restoring it', async () => {
    const onRefresh = vi.fn();
    const backup = { version: 1, plans: [], logs: [], settings };

    render(
      <SettingsView
        settings={settings}
        onSaveSettings={vi.fn()}
        onRefresh={onRefresh}
      />,
    );

    const input = screen
      .getByText(/import backup/i)
      .closest('label')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(
      input,
      new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' }),
    );

    await waitFor(() => expect(importPlannerData).toHaveBeenCalledWith(backup));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(window.alert).toHaveBeenCalledWith('Data imported successfully');
  });
});
