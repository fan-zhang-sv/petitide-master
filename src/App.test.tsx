import { render, screen, waitFor } from '@testing-library/react'
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

    await waitFor(() => expect(screen.getByRole('button', { name: /open catalog/i })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /open catalog/i }))
    await userEvent.click(await screen.findByRole('button', { name: /browse catalog/i }))

    expect(await screen.findByText('BPC-157')).toBeInTheDocument()
    expect(screen.getByText(/community references only/i)).toBeInTheDocument()
  })

  it('keeps Today focused by hiding cycle review details', async () => {
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /i understand/i }))

    expect(await screen.findByText(/no active plan/i)).toBeInTheDocument()
    expect(screen.queryByText('Cycle review')).not.toBeInTheDocument()
  })

  it('does not expose Dose Math as top-level navigation', async () => {
    render(<App />)

    await userEvent.click(await screen.findByRole('button', { name: /i understand/i }))

    expect(await screen.findByRole('button', { name: /open catalog/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /dose math/i })).not.toBeInTheDocument()
  })
})
