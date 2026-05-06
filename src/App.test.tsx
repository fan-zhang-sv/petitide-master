import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { db } from './db/database'

describe('App', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('accepts onboarding and opens the catalog', async () => {
    render(<App />)

    expect(await screen.findByText('Petitide Master')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /i understand/i }))

    await waitFor(() => expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument())
    await userEvent.click(
      within(screen.getByRole('navigation', { name: /primary/i })).getByRole('button', {
        name: /catalog/i,
      }),
    )

    expect(await screen.findByText('BPC-157')).toBeInTheDocument()
    expect(screen.getByText(/the provided Reddit protocol/i)).toBeInTheDocument()
  })

  it('keeps Today focused by hiding cycle review details', async () => {
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /i understand/i }))

    expect(await screen.findByText(/no active plan yet/i)).toBeInTheDocument()
    expect(screen.queryByText('Cycle review')).not.toBeInTheDocument()
  })
})
