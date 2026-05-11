import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'
import type { MigrationPhase, MigrationResult } from '../sync/migration'

export type { MigrationPhase } from '../sync/migration'

export interface MigrationStatus {
  phase: MigrationPhase
  error?: string
  result?: MigrationResult
}

export interface AuthContextValue {
  user: User | null
  authLoading: boolean
  firebaseEnabled: boolean
  migration: MigrationStatus
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  retryMigration: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
