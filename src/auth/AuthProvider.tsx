import {
  useCallback,
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
} from '../sync/migration'
import { db } from '../db/database'
import { AuthContext, type AuthContextValue, type MigrationStatus } from './AuthContext'

const initialMigration: MigrationStatus = { phase: 'idle' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // Derive initial loading state from environment constants to avoid effect-based setState
  const [authLoading, setAuthLoading] = useState(firebaseEnabled && !!auth)
  const [migration, setMigration] = useState<MigrationStatus>(initialMigration)
  const migrationRanFor = useRef<string | null>(null)

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
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
      // Defer resetting to initialMigration to avoid synchronous setState inside effect warning.
      // Alternatively, we could derive this state, but migration has its own lifecycle.
      if (migration.phase !== 'idle') {
        queueMicrotask(() => setMigration(initialMigration))
      }
      migrationRanFor.current = null
      return
    }
    if (migrationRanFor.current === user.uid) {
      return
    }
    migrationRanFor.current = user.uid
    void runMigration(user.uid)
  }, [user, runMigration, migration.phase])

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
      signInWithGoogle: signInWithGoogle,
      signOut: signOutAccount,
      retryMigration,
    }),
    [user, authLoading, migration, signInWithGoogle, signOutAccount, retryMigration],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
