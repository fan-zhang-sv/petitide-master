import { beforeEach, describe, expect, it, vi } from 'vitest'

// In-memory fake firestore. Keys are joined paths like "users/u1/plans/abc".
const store = new Map<string, Record<string, unknown>>()

function pathFromArgs(args: unknown[]): string {
  return args
    .filter((arg): arg is string | { __path: string } => {
      if (typeof arg === 'string') return true
      return (
        arg !== null && typeof arg === 'object' && '__path' in (arg as Record<string, unknown>)
      )
    })
    .map((arg) => (typeof arg === 'string' ? arg : arg.__path))
    .join('/')
}

vi.mock('firebase/firestore', () => {
  const collection = (...args: unknown[]) => ({ __path: pathFromArgs(args) })
  const doc = (...args: unknown[]) => ({ __path: pathFromArgs(args) })

  const getDocs = async (ref: { __path: string }) => {
    const prefix = ref.__path + '/'
    const docs: Array<{ ref: { __path: string }; data: () => Record<string, unknown> }> = []
    for (const [key, value] of store.entries()) {
      if (key.startsWith(prefix) && key.slice(prefix.length).indexOf('/') === -1) {
        docs.push({ ref: { __path: key }, data: () => value })
      }
    }
    return { docs }
  }

  const getDoc = async (ref: { __path: string }) => {
    const value = store.get(ref.__path)
    return {
      exists: () => value !== undefined,
      data: () => value,
    }
  }

  const setDoc = async (ref: { __path: string }, data: Record<string, unknown>) => {
    store.set(ref.__path, { ...data })
  }

  const deleteDoc = async (ref: { __path: string }) => {
    store.delete(ref.__path)
  }

  const writeBatch = () => {
    const ops: Array<() => void> = []
    return {
      set: (ref: { __path: string }, data: Record<string, unknown>) => {
        ops.push(() => store.set(ref.__path, { ...data }))
      },
      delete: (ref: { __path: string }) => {
        ops.push(() => store.delete(ref.__path))
      },
      commit: async () => {
        ops.forEach((op) => op())
      },
    }
  }

  const query = (ref: { __path: string }, ...constraints: Array<{ field: string; value: unknown }>) => ({
    __path: ref.__path,
    __constraints: constraints,
  })
  const where = (field: string, _op: string, value: unknown) => ({ field, value })

  // Wrap getDocs to honor query constraints when present.
  const getDocsWithFilter = async (ref: { __path: string; __constraints?: Array<{ field: string; value: unknown }> }) => {
    const result = await getDocs(ref)
    if (!ref.__constraints || ref.__constraints.length === 0) {
      return result
    }
    return {
      docs: result.docs.filter((d) => {
        const data = d.data() as Record<string, unknown>
        return ref.__constraints!.every((c) => data[c.field] === c.value)
      }),
    }
  }

  return {
    collection,
    doc,
    getDocs: getDocsWithFilter,
    getDoc,
    setDoc,
    deleteDoc,
    writeBatch,
    query,
    where,
    onSnapshot: vi.fn(() => () => {}),
    initializeFirestore: vi.fn(),
    memoryLocalCache: vi.fn(),
  }
})

import 'fake-indexeddb/auto'
import { migrateLocalToCloud } from './migration'
import { db, defaultSettings } from '../db/database'
import type { Firestore } from 'firebase/firestore'

const fakeFirestore = {} as Firestore

const isoLocal = '2026-01-10T00:00:00.000Z'
const isoNewer = '2026-02-10T00:00:00.000Z'

describe('migrateLocalToCloud', () => {
  beforeEach(async () => {
    store.clear()
    await db.delete()
    await db.open()
  })

  it('uploads all local data to an empty cloud and clears Dexie', async () => {
    await db.plans.put({
      id: 'p1',
      name: 'Local plan',
      route: 'subcutaneous',
      dose: '250mcg',
      frequency: { kind: 'daily' },
      startDate: '2026-01-01',
      injectionSites: [],
      createdAt: isoLocal,
      updatedAt: isoLocal,
    })
    await db.logs.put({
      id: 'l1',
      planId: 'p1',
      date: '2026-01-02',
      status: 'completed',
      createdAt: isoLocal,
      updatedAt: isoLocal,
    })
    await db.settings.put({
      ...defaultSettings,
      onboardingAccepted: true,
      updatedAt: isoLocal,
    })

    const result = await migrateLocalToCloud({
      uid: 'u1',
      firestore: fakeFirestore,
      db,
    })

    expect(result.hadLocalData).toBe(true)
    expect(result.plansWritten).toBe(1)
    expect(result.logsWritten).toBe(1)
    expect(store.get('users/u1/plans/p1')).toMatchObject({ name: 'Local plan', schemaVersion: 1 })
    expect(store.get('users/u1/logs/l1')).toBeDefined()
    expect(store.get('users/u1/settings/settings')).toMatchObject({ onboardingAccepted: true })
    expect(store.get('users/u1/meta/migration')).toBeDefined()
    expect(await db.plans.count()).toBe(0)
    expect(await db.logs.count()).toBe(0)
  })

  it('keeps the newest record on same-id conflict', async () => {
    await db.plans.put({
      id: 'p1',
      name: 'local-newer',
      route: 'subcutaneous',
      dose: '250mcg',
      frequency: { kind: 'daily' },
      startDate: '2026-01-01',
      injectionSites: [],
      createdAt: isoLocal,
      updatedAt: isoNewer,
    })
    store.set('users/u1/plans/p1', {
      id: 'p1',
      name: 'cloud-older',
      route: 'subcutaneous',
      dose: '250mcg',
      frequency: { kind: 'daily' },
      startDate: '2026-01-01',
      injectionSites: [],
      createdAt: isoLocal,
      updatedAt: isoLocal,
      schemaVersion: 1,
    })

    await migrateLocalToCloud({ uid: 'u1', firestore: fakeFirestore, db })

    expect((store.get('users/u1/plans/p1') as { name: string }).name).toBe('local-newer')
  })

  it('does not clear Dexie when verification fails', async () => {
    await db.plans.put({
      id: 'p1',
      name: 'Local plan',
      route: 'subcutaneous',
      dose: '250mcg',
      frequency: { kind: 'daily' },
      startDate: '2026-01-01',
      injectionSites: [],
      createdAt: isoLocal,
      updatedAt: isoLocal,
    })

    // Simulate verification failure: drop the cloud doc immediately after the
    // batch write by deleting it from the fake store right before verifyCloud reads.
    const original = store.set.bind(store)
    let dropOnce = false
    store.set = ((key: string, value: Record<string, unknown>) => {
      original(key, value)
      if (!dropOnce && key === 'users/u1/plans/p1') {
        dropOnce = true
        store.delete(key)
      }
      return store
    }) as typeof store.set

    await expect(
      migrateLocalToCloud({ uid: 'u1', firestore: fakeFirestore, db }),
    ).rejects.toThrow(/verification failed/i)

    store.set = original
    expect(await db.plans.count()).toBe(1)
  })
})
