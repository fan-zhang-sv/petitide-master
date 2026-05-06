export type RouteType =
  | 'subcutaneous'
  | 'intranasal'
  | 'oral'
  | 'topical'
  | 'iv'
  | 'implant'
  | 'mixed'
  | 'unspecified'

export type EvidenceLevel = 'clinical' | 'wellness' | 'limited' | 'experimental' | 'advanced'

export type FrequencyKind = 'daily' | 'weekly' | 'times-per-week' | 'as-needed'

export interface FrequencyConfig {
  kind: FrequencyKind
  timesPerWeek?: number
}

export interface ProtocolTemplate {
  id: string
  name: string
  aliases?: string[]
  category: string
  typicalDose: string
  defaultRoute: RouteType
  routeText: string
  defaultFrequency: FrequencyConfig
  cycleText: string
  timeOffText: string
  cycleDays?: number
  offDays?: number
  benefits: string
  notes: string
  evidence: EvidenceLevel
  flags: string[]
}

export interface PlannedPeptide {
  id: string
  templateId?: string
  name: string
  route: RouteType
  dose: string
  frequency: FrequencyConfig
  startDate: string
  cycleDays?: number
  offDays?: number
  reminderTime?: string
  injectionSites: string[]
  notes?: string
  calculator?: ReconstitutionResult
  createdAt: string
  archived?: boolean
}

export type LogStatus = 'completed' | 'skipped'

export interface InjectionLog {
  id: string
  planId: string
  date: string
  status: LogStatus
  actualDose?: string
  site?: string
  vial?: string
  notes?: string
  sideEffects?: string
  createdAt: string
}

export interface AppSettings {
  id: 'settings'
  onboardingAccepted: boolean
  preferredDoseUnit: 'mcg' | 'mg' | 'IU'
  notificationPermissionAsked: boolean
  updatedAt: string
}

export interface ReconstitutionInput {
  vialAmount: number
  vialUnit: 'mg' | 'mcg'
  bacWaterMl: number
  targetDose: number
  targetUnit: 'mg' | 'mcg'
  syringeUnitsPerMl: number
  dosesAlreadyUsed?: number
}

export interface ReconstitutionResult {
  vialAmountMcg: number
  targetDoseMcg: number
  concentrationMcgPerMl: number
  drawMl: number
  syringeUnits: number
  dosesPerVial: number
  remainingDoses: number
  warnings: string[]
}

export interface DayPlanStatus {
  plan: PlannedPeptide
  date: string
  cycleState: 'upcoming' | 'active' | 'off'
  due: boolean
  overdue: boolean
  completed: boolean
  skipped: boolean
  missed: boolean
  nextTransitionDate?: string
  scheduleConfidence?: 'high' | 'medium' | 'low'
  scheduleAnchorDate?: string
}
export type MainTab = 'today' | 'plans' | 'calendar' | 'tools' | 'dose-math' | 'settings'

export interface TabConfig {
  id: MainTab
  label: string
  icon: any // Lucide icon type
}
