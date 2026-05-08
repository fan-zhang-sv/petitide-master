import type { AppSettings, InjectionLog, PlannedPeptide } from '../types'

export interface PlannerSnapshot {
  plans: PlannedPeptide[]
  logs: InjectionLog[]
  settings: AppSettings
}

export interface PlannerRepository {
  subscribe(listener: (snapshot: PlannerSnapshot) => void): () => void
  load(): Promise<PlannerSnapshot>
  acceptOnboarding(): Promise<void>
  saveSettings(patch: Partial<AppSettings>): Promise<void>
  addPlan(plan: Omit<PlannedPeptide, 'id' | 'createdAt'>): Promise<PlannedPeptide>
  updatePlan(id: string, patch: Partial<PlannedPeptide>): Promise<void>
  archivePlan(id: string): Promise<void>
  addLog(log: Omit<InjectionLog, 'id' | 'createdAt'>): Promise<void>
}
