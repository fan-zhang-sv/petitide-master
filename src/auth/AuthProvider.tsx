import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth, firebaseEnabled, firestore, googleProvider } from '../lib/firebase'
import {
  migrateLocalToCloud,
  type MigrationPhase,
  type MigrationResult,
} from '../sync/migration'
import { db } from '../db/database'

export type { MigrationPhase } from '../sync/migration'

export interface MigrationStatus {
  phase: MigrationPhase
  error?: string
  result?: MigrationResult
}

interface AuthContextValue {
  user: User | null
  authLoading: boolean
  firebaseEnabled: boolean
  migration: MigrationStatus
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  retryMigration: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const initialMigration: MigrationStatus = { phase: 'idle' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(firebaseEnabled)
  const [migration, setMigration] = useState<MigrationStatus>(initialMigration)
  const migrationRanFor = useRef<string | null>(null)

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setAuthLoading(false)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(next)
      setAuthLoading(false)
    })
    return unsubscribe
  }, [])

  const runMigration = useCallback(async (uid: string) => {
    if (!firestore) {
      return
    }
    try {
      setMigration({ phase: 'reading-local' })
      const result = await migrateLocalToCloud({
        uid,
        firestore,
        db,
        onPhase: (phase) => setMigration({ phase }),
      })
      setMigration({ phase: 'done', result })
    } catch (error) {
      setMigration({
        phase: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setMigration(initialMigration)
      migrationRanFor.current = null
      return
    }
    if (migrationRanFor.current === user.uid) {
      return
    }
    migrationRanFor.current = user.uid
    void runMigration(user.uid)
  }, [user, runMigration])

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseEnabled || !auth || !googleProvider) {
      throw new Error('Firebase is not configured.')
    }
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      const code = (error as { code?: string }).code
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithRedirect(auth, new GoogleAuthProvider())
        return
      }
      throw error
    }
  }, [])

  const signOutAccount = useCallback(async () => {
    if (!firebaseEnabled || !auth) {
      return
    }
    await firebaseSignOut(auth)
  }, [])

  const retryMigration = useCallback(async () => {
    if (user) {
      migrationRanFor.current = user.uid
      await runMigration(user.uid)
    }
  }, [user, runMigration])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authLoading,
      firebaseEnabled,
      migration,
      signInWithGoogle,
      signOut: signOutAccount,
      retryMigration,
    }),
    [user, authLoading, migration, signInWithGoogle, signOutAccount, retryMigration],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
