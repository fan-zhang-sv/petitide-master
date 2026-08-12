import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('adds a catalog template and logs an injection', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /i understand/i }).click()
  await page.getByRole('button', { name: /open catalog/i }).click()
  await page.getByRole('button', { name: /browse catalog/i }).click()
  await page.getByRole('button', { name: /^add$/i }).first().click()
  await page.getByRole('button', { name: /save plan/i }).click()
  await page.getByRole('button', { name: 'Today' }).click()
  await expect(page.getByRole('heading', { name: 'BPC-157' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Log completed dose' }).click()
  await expect(page.getByText(/Completed/)).toBeVisible()
  await page.getByRole('button', { name: 'Calendar' }).click()
  const monthHeading = page.getByRole('heading', { level: 2 }).first()
  const currentMonth = await monthHeading.textContent()
  await page.getByLabel('Calendar navigation').getByRole('button', { name: /next/i }).click()
  await expect(monthHeading).not.toHaveText(currentMonth ?? '')
})

test('exports a settings backup download', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /i understand/i }).click()
  await page.getByRole('button', { name: 'Settings' }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /export backup/i }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^peptide-master-backup-\d{4}-\d{2}-\d{2}\.json$/)

  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()

  const backup = JSON.parse(await readFile(downloadPath!, 'utf8')) as {
    version?: number
    plans?: unknown[]
    logs?: unknown[]
    settings?: { onboardingAccepted?: boolean }
  }

  expect(backup.version).toBe(1)
  expect(backup.plans).toEqual([])
  expect(backup.logs).toEqual([])
  expect(backup.settings?.onboardingAccepted).toBe(true)
})
