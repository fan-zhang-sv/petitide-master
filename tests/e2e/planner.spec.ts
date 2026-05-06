import { expect, test } from '@playwright/test'

test('adds a catalog template and logs an injection', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /i understand/i }).click()
  const primaryNav = page.getByRole('navigation', { name: /primary/i })
  await primaryNav.getByRole('button', { name: 'Catalog' }).click()
  await page.getByRole('button', { name: /add to plan/i }).first().click()
  await page.getByRole('button', { name: /save plan/i }).click()
  await primaryNav.getByRole('button', { name: 'Today' }).click()
  await expect(page.getByRole('heading', { name: 'BPC-157' }).first()).toBeVisible()
  await page.getByRole('button', { name: /done/i }).first().click()
  await expect(page.getByText('Completed')).toBeVisible()
})
