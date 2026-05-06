import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  AlertTriangle,
  Archive,
  Bell,
  Calculator,
  CalendarDays,
  Check,
  Download,
  FlaskConical,
  Home,
  Library,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  SkipForward,
  Syringe,
  Upload,
} from 'lucide-react'
import './App.css'
import { clearPlannerData, exportPlannerData, importPlannerData } from './db/database'
import { usePlannerStore } from './db/usePlannerStore'
import { PROTOCOL_SOURCE_URL, protocolCatalog } from './data/protocolCatalog'
import { requestNotificationPermission, sendDueNotification } from './pwa/notifications'
import type {
  DayPlanStatus,
  EvidenceLevel,
  FrequencyConfig,
  InjectionLog,
  AppSettings,
  PlannedPeptide,
  ProtocolTemplate,
  ReconstitutionInput,
  RouteType,
} from './types'
import { addIsoDays, daysBetween, todayIso } from './utils/dates'
import {
  cycleLabel,
  frequencyLabel,
  getAdherence,
  getDayPlanStatus,
  getStatusesForDate,
} from './utils/cycleEngine'
import { calculateReconstitution, formatNumber } from './utils/reconstitution'
import { analyzeCycleReview, type CycleReview } from './utils/cycleReview'

type Tab = 'dashboard' | 'catalog' | 'planner' | 'calendar' | 'calculator' | 'settings'

const routeOptions: RouteType[] = [
  'subcutaneous',
  'intranasal',
  'oral',
  'topical',
  'iv',
  'implant',
  'mixed',
  'unspecified',
]

const evidenceLabel: Record<EvidenceLevel, string> = {
  clinical: 'Clinical context',
  wellness: 'Wellness use',
  limited: 'Limited evidence',
  experimental: 'Experimental',
  advanced: 'Advanced caution',
}

const tabs: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: 'dashboard', label: 'Today', icon: Home },
  { id: 'catalog', label: 'Catalog', icon: Library },
  { id: 'planner', label: 'Plan', icon: Syringe },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'calculator', label: 'Dose Math', icon: Calculator },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const defaultSites = ['Abdomen L', 'Abdomen R', 'Thigh L', 'Thigh R', 'Arm L', 'Arm R']

function App() {
  const store = usePlannerStore()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  if (store.loading || !store.settings) {
    return (
      <main className="app-shell centered">
        <div className="loading-card">
          <Syringe aria-hidden />
          <span>Loading planner</span>
        </div>
      </main>
    )
  }

  if (!store.settings.onboardingAccepted) {
    return <Onboarding onAccept={store.acceptOnboarding} />
  }

  const today = todayIso()
  const todayStatuses = getStatusesForDate(store.activePlans, store.logs, today)
  const overdueStatuses = store.activePlans
    .flatMap((plan) =>
      Array.from({ length: 14 }, (_, index) => {
        const date = addIsoDays(today, -index)
        return getDayPlanStatus(plan, store.logs, date, today)
      }),
    )
    .filter((status) => status.overdue)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local-first PWA</p>
          <h1>Petitide Master</h1>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Send due notification"
          title="Send due notification"
          onClick={() => sendDueNotification(overdueStatuses)}
        >
          <Bell aria-hidden />
        </button>
      </header>

      <nav className="tabbar" aria-label="Primary">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon aria-hidden />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {activeTab === 'dashboard' && (
        <Dashboard
          plans={store.activePlans}
          logs={store.logs}
          todayStatuses={todayStatuses}
          overdueStatuses={overdueStatuses}
          onLog={store.addLog}
          onOpenCatalog={() => setActiveTab('catalog')}
        />
      )}
      {activeTab === 'catalog' && <Catalog onAddPlan={store.addPlan} />}
      {activeTab === 'planner' && (
        <Planner
          plans={store.activePlans}
          logs={store.logs}
          onArchive={store.archivePlan}
          onUpdatePlan={store.updatePlan}
        />
      )}
      {activeTab === 'calendar' && (
        <CalendarView plans={store.activePlans} logs={store.logs} onLog={store.addLog} />
      )}
      {activeTab === 'calculator' && (
        <ReconstitutionCalculator plans={store.activePlans} onUpdatePlan={store.updatePlan} />
      )}
      {activeTab === 'settings' && (
        <SettingsView
          settings={store.settings}
          onSaveSettings={store.saveSettings}
          onRefresh={store.refresh}
        />
      )}
    </main>
  )
}

function Onboarding({ onAccept }: { onAccept: () => Promise<void> }) {
  return (
    <main className="onboarding">
      <section className="onboarding-panel">
        <div className="brand-mark">
          <Syringe aria-hidden />
        </div>
        <p className="eyebrow">Petitide Master</p>
        <h1>Track plans, logs, and vial math without sending health data to a server.</h1>
        <p>
          This app is for personal tracking and educational reference only. It does not recommend
          peptides, dosing, stacks, or treatment decisions. Confirm any protocol with a qualified
          clinician and product-specific instructions.
        </p>
        <div className="notice">
          Seeded protocol rows are editable templates derived from the user-provided Reddit
          reference. Vendor links are excluded.
        </div>
        <button type="button" className="primary-button" onClick={() => void onAccept()}>
          <Check aria-hidden />
          I understand
        </button>
      </section>
    </main>
  )
}

function Dashboard({
  plans,
  logs,
  todayStatuses,
  overdueStatuses,
  onLog,
  onOpenCatalog,
}: {
  plans: PlannedPeptide[]
  logs: InjectionLog[]
  todayStatuses: DayPlanStatus[]
  overdueStatuses: DayPlanStatus[]
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>
  onOpenCatalog: () => void
}) {
  const adherence = getAdherence(plans, logs)
  const dueToday = todayStatuses.filter((status) => status.due)
  const completedToday = todayStatuses.filter((status) => status.completed || status.skipped)
  const actionItems = [...overdueStatuses, ...dueToday].filter(
    (status, index, all) =>
      all.findIndex((item) => item.plan.id === status.plan.id && item.date === status.date) === index &&
      !status.completed &&
      !status.skipped,
  )
  const offCycleToday = todayStatuses.filter((status) => status.cycleState === 'off')
  const upcomingChanges = todayStatuses
    .filter((status) => status.nextTransitionDate)
    .sort((a, b) => a.nextTransitionDate!.localeCompare(b.nextTransitionDate!))
    .slice(0, 4)

  return (
    <section className="screen">
      {plans.length === 0 ? (
        <EmptyState
          title="No active plan yet"
          body="Choose a protocol template or add a custom entry to start tracking."
          actionLabel="Open catalog"
          onAction={onOpenCatalog}
        />
      ) : (
        <>
          <section className="today-hero">
            <div>
              <p className="eyebrow">Today · {todayIso()}</p>
              <h2>{actionItems.length > 0 ? `${actionItems.length} action${actionItems.length === 1 ? '' : 's'} to handle` : 'Nothing due right now'}</h2>
              <p>
                {actionItems.length > 0
                  ? 'Log what you did, or skip it with a note. Everything else is tucked below.'
                  : 'You are clear for today. Check upcoming cycle changes below.'}
              </p>
            </div>
            <div className="today-score">
              <strong>{adherence.due > 0 ? `${adherence.rate}%` : 'New'}</strong>
              <span>{adherence.due > 0 ? 'past adherence' : 'no past days'}</span>
            </div>
          </section>

          <div className="metric-grid today-metrics">
            <Metric label="Do now" value={actionItems.length} tone={actionItems.length ? 'danger' : 'cool'} />
            <Metric label="Off cycle" value={offCycleToday.length} tone="warm" />
            <Metric label="Logged today" value={completedToday.length} tone="cool" />
          </div>

          <section className="section-band essentials">
            <div className="section-heading">
              <h2>Essential actions</h2>
              <span>{actionItems.length ? 'Needs attention' : 'Clear'}</span>
            </div>
            {actionItems.length > 0 ? (
              <div className="stack">
                {actionItems.map((status) => (
                  <StatusCard
                    key={`${status.plan.id}-${status.date}`}
                    status={status}
                    logs={logs}
                    onLog={onLog}
                    simple
                  />
                ))}
              </div>
            ) : (
              <div className="clear-state">
                <Check aria-hidden />
                <div>
                  <h3>No injections due today.</h3>
                  <p>Off-cycle and future items stay visible below so you can still plan ahead.</p>
                </div>
              </div>
            )}
          </section>

          <details className="section-band">
            <summary>Plan status and upcoming cycle changes</summary>
            <div className="support-grid">
              {upcomingChanges.length > 0 ? (
                upcomingChanges.map((status) => (
                  <div key={status.plan.id} className="support-item">
                    <strong>{status.plan.name}</strong>
                    <span>
                      {status.cycleState === 'off' ? 'Back on' : 'Goes off'} {status.nextTransitionDate}
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted">No fixed cycle changes for active plans.</p>
              )}
            </div>
          </details>

          {completedToday.length > 0 && (
            <details className="section-band" open>
              <summary>Logged today</summary>
              <div className="stack compact logged-list">
                {completedToday.map((status) => (
                  <StatusCard
                    key={`logged-${status.plan.id}-${status.date}`}
                    status={status}
                    logs={logs}
                    onLog={onLog}
                    simple
                  />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function StatusCard({
  status,
  logs,
  onLog,
  simple = false,
}: {
  status: DayPlanStatus
  logs: InjectionLog[]
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>
  simple?: boolean
}) {
  const existingLog = logs.find((log) => log.planId === status.plan.id && log.date === status.date)
  const [site, setSite] = useState(existingLog?.site ?? status.plan.injectionSites[0] ?? '')
  const [notes, setNotes] = useState(existingLog?.notes ?? '')
  const [sideEffects, setSideEffects] = useState(existingLog?.sideEffects ?? '')

  const log = (logStatus: 'completed' | 'skipped') =>
    onLog({
      planId: status.plan.id,
      date: status.date,
      status: logStatus,
      actualDose: status.plan.dose,
      site,
      notes,
      sideEffects,
    })

  return (
    <article className={`status-card ${status.cycleState} ${simple ? 'simple' : ''}`}>
      <div>
        <div className="card-title-row">
          <h3>{status.plan.name}</h3>
          <span className={`pill ${status.completed || status.skipped ? 'done' : status.cycleState}`}>
            {status.completed
              ? 'Completed'
              : status.skipped
                ? 'Skipped'
                : status.due
                  ? status.overdue
                    ? 'Due'
                    : 'Planned'
                  : status.cycleState === 'off'
                    ? 'Off cycle'
                    : 'Not due'}
          </span>
        </div>
        <p className={simple ? 'action-line' : ''}>
          {status.date !== todayIso() ? `${status.date} · ` : ''}
          {status.plan.dose || 'Dose not set'}
          {!simple ? ` · ${frequencyLabel(status.plan.frequency)}` : ''}
        </p>
        {!simple && (
          <p className="muted">
            {cycleLabel(status.plan)}
            {status.nextTransitionDate ? ` · next change ${status.nextTransitionDate}` : ''}
          </p>
        )}
      </div>

      {status.due && !status.completed && !status.skipped && (
        <form className="log-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            Where did you inject?
            <select value={site} onChange={(event) => setSite(event.target.value)}>
              {[...new Set([site, ...status.plan.injectionSites].filter(Boolean))].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <details className="inline-details">
            <summary>Add notes or side effects</summary>
            <label>
              Notes
              <input value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
            <label>
              Side effects
              <input value={sideEffects} onChange={(event) => setSideEffects(event.target.value)} />
            </label>
          </details>
          <div className="button-row">
            <button type="button" className="primary-button small" onClick={() => void log('completed')}>
              <Check aria-hidden />
              Mark done
            </button>
            <button type="button" className="ghost-button small" onClick={() => void log('skipped')}>
              <SkipForward aria-hidden />
              Skip
            </button>
          </div>
        </form>
      )}
    </article>
  )
}

function Catalog({
  onAddPlan,
}: {
  onAddPlan: (plan: Omit<PlannedPeptide, 'id' | 'createdAt'>) => Promise<PlannedPeptide>
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [route, setRoute] = useState('all')
  const [showAdvanced, setShowAdvanced] = useState(true)
  const [selected, setSelected] = useState<ProtocolTemplate | null>(null)

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(protocolCatalog.map((item) => item.category))).sort()],
    [],
  )

  const filtered = protocolCatalog.filter((item) => {
    const searchText = [item.name, item.aliases?.join(' '), item.category, item.benefits, item.notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const matchesQuery = searchText.includes(query.toLowerCase())
    const matchesCategory = category === 'all' || item.category === category
    const matchesRoute = route === 'all' || item.defaultRoute === route
    const matchesAdvanced = showAdvanced || !['advanced', 'experimental'].includes(item.evidence)
    return matchesQuery && matchesCategory && matchesRoute && matchesAdvanced
  })

  return (
    <section className="screen">
      <div className="guide-strip">
        <div>
          <strong>1. Pick a template</strong>
          <span>Search by goal, compound, or route.</span>
        </div>
        <div>
          <strong>2. Review the basics</strong>
          <span>Dose, start date, frequency, cycle.</span>
        </div>
        <div>
          <strong>3. Save and log today</strong>
          <span>Advanced options stay available.</span>
        </div>
      </div>
      <div className="toolbar">
        <label>
          Search
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="BPC, GLP, sleep" />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? 'All categories' : item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Route
          <select value={route} onChange={(event) => setRoute(event.target.value)}>
            <option value="all">All routes</option>
            {routeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showAdvanced}
            onChange={(event) => setShowAdvanced(event.target.checked)}
          />
          Include advanced
        </label>
      </div>

      <div className="source-note">
        Templates are educational references from{' '}
        <a href={PROTOCOL_SOURCE_URL} target="_blank" rel="noreferrer">
          the provided Reddit protocol
        </a>
        . Edit every plan before use.
      </div>

      <div className="catalog-grid">
        {filtered.map((item) => (
          <article key={item.id} className="catalog-card">
            <div className="card-title-row">
              <h3>{item.name}</h3>
              <span className={`pill ${item.evidence}`}>{evidenceLabel[item.evidence]}</span>
            </div>
            <p className="muted">{item.category}</p>
            <dl>
              <div>
                <dt>Dose</dt>
                <dd>{item.typicalDose}</dd>
              </div>
              <div>
                <dt>Cycle</dt>
                <dd>
                  {item.cycleText} · off {item.timeOffText}
                </dd>
              </div>
            </dl>
            <p>{item.benefits}</p>
            <p className="muted">{item.notes}</p>
            <button type="button" className="primary-button small" onClick={() => setSelected(item)}>
              <Plus aria-hidden />
              Add to plan
            </button>
          </article>
        ))}
      </div>

      {selected && (
        <PlanDialog
          template={selected}
          onClose={() => setSelected(null)}
          onAdd={async (plan) => {
            await onAddPlan(plan)
            setSelected(null)
          }}
        />
      )}
    </section>
  )
}

function PlanDialog({
  template,
  onClose,
  onAdd,
}: {
  template: ProtocolTemplate
  onClose: () => void
  onAdd: (plan: Omit<PlannedPeptide, 'id' | 'createdAt'>) => Promise<void>
}) {
  const [name, setName] = useState(template.name)
  const [dose, setDose] = useState(template.typicalDose)
  const [route, setRoute] = useState<RouteType>(template.defaultRoute)
  const [frequencyKind, setFrequencyKind] = useState<FrequencyConfig['kind']>(
    template.defaultFrequency.kind,
  )
  const [timesPerWeek, setTimesPerWeek] = useState(template.defaultFrequency.timesPerWeek ?? 2)
  const [startDate, setStartDate] = useState(todayIso())
  const [cycleDays, setCycleDays] = useState(template.cycleDays?.toString() ?? '')
  const [offDays, setOffDays] = useState(template.offDays?.toString() ?? '')
  const [reminderTime, setReminderTime] = useState('08:00')
  const [sites, setSites] = useState(defaultSites.join(', '))
  const [notes, setNotes] = useState(template.notes)
  const [expertOpen, setExpertOpen] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void onAdd({
      templateId: template.id,
      name,
      dose,
      route,
      frequency: { kind: frequencyKind, timesPerWeek: frequencyKind === 'times-per-week' ? timesPerWeek : undefined },
      startDate,
      cycleDays: cycleDays ? Number(cycleDays) : undefined,
      offDays: offDays ? Number(offDays) : undefined,
      reminderTime,
      injectionSites: sites
        .split(',')
        .map((site) => site.trim())
        .filter(Boolean),
      notes,
    })
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="dialog" onSubmit={submit}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Quick setup</p>
            <h2>Configure {template.name}</h2>
          </div>
          <button type="button" className="ghost-button small" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="notice compact-notice">
          Start with the fields below. Open expert options only if you need to customize route,
          injection sites, or protocol notes.
        </div>
        <FormGrid>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Dose
            <input value={dose} onChange={(event) => setDose(event.target.value)} required />
          </label>
          <label>
            Frequency
            <select
              value={frequencyKind}
              onChange={(event) => setFrequencyKind(event.target.value as FrequencyConfig['kind'])}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="times-per-week">Times per week</option>
              <option value="as-needed">As needed</option>
            </select>
          </label>
          {frequencyKind === 'times-per-week' && (
            <label>
              Times weekly
              <input
                type="number"
                min="1"
                max="7"
                value={timesPerWeek}
                onChange={(event) => setTimesPerWeek(Number(event.target.value))}
              />
            </label>
          )}
          <label>
            Start date
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label>
            Cycle days
            <input
              type="number"
              min="0"
              value={cycleDays}
              onChange={(event) => setCycleDays(event.target.value)}
              placeholder="No fixed cycle"
            />
          </label>
          <label>
            Off days
            <input
              type="number"
              min="0"
              value={offDays}
              onChange={(event) => setOffDays(event.target.value)}
              placeholder="No fixed off-cycle"
            />
          </label>
          <label>
            Reminder time
            <input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />
          </label>
        </FormGrid>
        <details className="expert-panel" open={expertOpen} onToggle={(event) => setExpertOpen(event.currentTarget.open)}>
          <summary>Expert options</summary>
          <FormGrid>
            <label>
              Route
              <select value={route} onChange={(event) => setRoute(event.target.value as RouteType)}>
                {routeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Injection site rotation
              <input value={sites} onChange={(event) => setSites(event.target.value)} />
            </label>
          </FormGrid>
          <label>
            Plan notes
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
        </details>
        <button type="submit" className="primary-button">
          <Plus aria-hidden />
          Save plan
        </button>
      </form>
    </div>
  )
}

function Planner({
  plans,
  logs,
  onArchive,
  onUpdatePlan,
}: {
  plans: PlannedPeptide[]
  logs: InjectionLog[]
  onArchive: (id: string) => Promise<void>
  onUpdatePlan: (id: string, patch: Partial<PlannedPeptide>) => Promise<void>
}) {
  const [editingPlan, setEditingPlan] = useState<PlannedPeptide | null>(null)

  if (plans.length === 0) {
    return (
      <section className="screen">
        <EmptyState title="Plan is empty" body="Add a peptide from the catalog to build your schedule." />
      </section>
    )
  }

  return (
    <section className="screen planner-list">
      {plans.map((plan) => {
        const status = getDayPlanStatus(plan, logs, todayIso())
        const review = analyzeCycleReview(plan, logs)
        return (
          <article key={plan.id} className="plan-card">
            <div className="card-title-row">
              <h2>{plan.name}</h2>
              <span className={`pill ${status.cycleState}`}>{status.cycleState}</span>
            </div>
            <div className="detail-grid">
              <Detail label="Dose" value={plan.dose} />
              <Detail label="Route" value={plan.route} />
              <Detail label="Frequency" value={frequencyLabel(plan.frequency)} />
              <Detail label="Cycle" value={cycleLabel(plan)} />
              <Detail label="Start" value={plan.startDate} />
              <Detail label="Reminder" value={plan.reminderTime || 'None'} />
            </div>
            {plan.calculator && (
              <div className="calc-summary">
                <FlaskConical aria-hidden />
                {formatNumber(plan.calculator.syringeUnits)} units · {formatNumber(plan.calculator.drawMl, 3)} mL
              </div>
            )}
            <CycleReviewCard planName={plan.name} review={review} />
            {plan.notes && <p className="muted">{plan.notes}</p>}
            <div className="button-row">
              <button type="button" className="primary-button small" onClick={() => setEditingPlan(plan)}>
                <Pencil aria-hidden />
                Edit
              </button>
              <button type="button" className="ghost-button small" onClick={() => void onArchive(plan.id)}>
                <Archive aria-hidden />
                Archive
              </button>
            </div>
          </article>
        )
      })}
      {editingPlan && (
        <PlanEditDialog
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSave={async (patch) => {
            await onUpdatePlan(editingPlan.id, patch)
            setEditingPlan(null)
          }}
        />
      )}
    </section>
  )
}

function CycleReviewCard({
  planName,
  review,
  compact = false,
}: {
  planName: string
  review: CycleReview
  compact?: boolean
}) {
  return (
    <aside className={`cycle-review-card ${review.level} ${compact ? 'compact-review' : ''}`}>
      <div className="cycle-review-heading">
        <AlertTriangle aria-hidden />
        <div>
          <span>{planName}</span>
          <strong>{review.headline}</strong>
        </div>
      </div>
      <p>{review.detail}</p>
      <ul>
        {review.facts.slice(0, compact ? 2 : 4).map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      {review.baseline && (
        <div className={`baseline-chip ${review.baseline.confidence}`}>
          <strong>{review.baseline.label}</strong>
          <span>
            {review.baseline.date} · {review.baseline.confidence} confidence
          </span>
        </div>
      )}
      <small>Not medical advice. Use this as a review prompt, not a switch instruction.</small>
    </aside>
  )
}

function PlanEditDialog({
  plan,
  onClose,
  onSave,
}: {
  plan: PlannedPeptide
  onClose: () => void
  onSave: (patch: Partial<PlannedPeptide>) => Promise<void>
}) {
  const [name, setName] = useState(plan.name)
  const [dose, setDose] = useState(plan.dose)
  const [route, setRoute] = useState<RouteType>(plan.route)
  const [frequencyKind, setFrequencyKind] = useState<FrequencyConfig['kind']>(plan.frequency.kind)
  const [timesPerWeek, setTimesPerWeek] = useState(plan.frequency.timesPerWeek ?? 2)
  const [startDate, setStartDate] = useState(plan.startDate)
  const [cycleDays, setCycleDays] = useState(plan.cycleDays?.toString() ?? '')
  const [offDays, setOffDays] = useState(plan.offDays?.toString() ?? '')
  const [reminderTime, setReminderTime] = useState(plan.reminderTime ?? '')
  const [sites, setSites] = useState(plan.injectionSites.join(', '))
  const [notes, setNotes] = useState(plan.notes ?? '')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void onSave({
      name,
      dose,
      route,
      frequency: {
        kind: frequencyKind,
        timesPerWeek: frequencyKind === 'times-per-week' ? timesPerWeek : undefined,
      },
      startDate,
      cycleDays: cycleDays ? Number(cycleDays) : undefined,
      offDays: offDays ? Number(offDays) : undefined,
      reminderTime,
      injectionSites: sites
        .split(',')
        .map((site) => site.trim())
        .filter(Boolean),
      notes,
    })
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="dialog" onSubmit={submit}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Edit plan</p>
            <h2>{plan.name}</h2>
          </div>
          <button type="button" className="ghost-button small" onClick={onClose}>
            Close
          </button>
        </div>
        <FormGrid>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Dose
            <input value={dose} onChange={(event) => setDose(event.target.value)} required />
          </label>
          <label>
            Route
            <select value={route} onChange={(event) => setRoute(event.target.value as RouteType)}>
              {routeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Frequency
            <select
              value={frequencyKind}
              onChange={(event) => setFrequencyKind(event.target.value as FrequencyConfig['kind'])}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="times-per-week">Times per week</option>
              <option value="as-needed">As needed</option>
            </select>
          </label>
          {frequencyKind === 'times-per-week' && (
            <label>
              Times weekly
              <input
                type="number"
                min="1"
                max="7"
                value={timesPerWeek}
                onChange={(event) => setTimesPerWeek(Number(event.target.value))}
              />
            </label>
          )}
          <label>
            Start date
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label>
            Cycle days
            <input type="number" min="0" value={cycleDays} onChange={(event) => setCycleDays(event.target.value)} />
          </label>
          <label>
            Off days
            <input type="number" min="0" value={offDays} onChange={(event) => setOffDays(event.target.value)} />
          </label>
          <label>
            Reminder time
            <input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />
          </label>
          <label>
            Injection site rotation
            <input value={sites} onChange={(event) => setSites(event.target.value)} />
          </label>
        </FormGrid>
        <label>
          Plan notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <button type="submit" className="primary-button">
          <Check aria-hidden />
          Save changes
        </button>
      </form>
    </div>
  )
}

function CalendarView({
  plans,
  logs,
  onLog,
}: {
  plans: PlannedPeptide[]
  logs: InjectionLog[]
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>
}) {
  const [futureDays, setFutureDays] = useState(120)
  const firstPlanDate = plans.length > 0 ? [...plans].sort((a, b) => a.startDate.localeCompare(b.startDate))[0].startDate : todayIso()
  const lastDate = addIsoDays(todayIso(), futureDays)
  const dates = Array.from({ length: daysBetween(firstPlanDate, lastDate) + 1 }, (_, index) =>
    addIsoDays(firstPlanDate, index),
  )
  const transitions = plans
    .map((plan) => {
      const status = getDayPlanStatus(plan, logs, todayIso())
      return status.nextTransitionDate
        ? {
            plan,
            state: status.cycleState,
            date: status.nextTransitionDate,
            days: daysBetween(todayIso(), status.nextTransitionDate),
          }
        : undefined
    })
    .filter(Boolean)
    .sort((a, b) => a!.date.localeCompare(b!.date))

  return (
    <section className="screen">
      <section className="calendar-controls">
        <div>
          <p className="eyebrow">Calendar range</p>
          <h2>History and off-cycle planning</h2>
        </div>
        <div className="range-readout">
          <span>Starts</span>
          <strong>{firstPlanDate}</strong>
        </div>
        <label>
          Future
          <select value={futureDays} onChange={(event) => setFutureDays(Number(event.target.value))}>
            <option value={60}>60 days ahead</option>
            <option value={120}>120 days ahead</option>
            <option value={240}>240 days ahead</option>
            <option value={365}>1 year ahead</option>
          </select>
        </label>
      </section>

      <section className="transition-strip">
        {transitions.length > 0 ? (
          transitions.map((transition) => (
            <div key={transition!.plan.id}>
              <strong>{transition!.plan.name}</strong>
              <span>
                {transition!.state === 'off' ? 'Review restart around' : 'Review off-cycle around'} {transition!.date}
                {transition!.days >= 0 ? ` · in ${transition!.days} days` : ''}
              </span>
            </div>
          ))
        ) : (
          <p className="muted">No fixed cycle transitions to show.</p>
        )}
      </section>
      <div className="source-note">
        Past rows are editable. Use Done when it happened and Not done when it did not. Review dates are planning baselines, not medical instructions.
      </div>

      <section className="calendar-legend" aria-label="Calendar color guide">
        <span className="legend-item due">Due now</span>
        <span className="legend-item done">Done</span>
        <span className="legend-item missed">Missed</span>
        <span className="legend-item on">On cycle</span>
        <span className="legend-item off">Off cycle</span>
        <span className="legend-item transition">Cycle change</span>
      </section>

      <div className="calendar-strip">
        {dates.map((date) => {
          const statuses = getStatusesForDate(plans, logs, date)
          const due = statuses.filter((status) => status.due)
          const off = statuses.filter((status) => status.cycleState === 'off')
          const transitionsToday = transitions.filter((transition) => transition?.date === date)
          return (
            <article
              key={date}
              className={`day-cell ${date === todayIso() ? 'today' : ''} ${off.length && due.length === 0 ? 'off-day' : ''} ${transitionsToday.length ? 'transition-day' : ''}`}
            >
              <div className="day-head">
                <strong>{date.slice(5)}</strong>
                <span>{date === todayIso() ? 'Today' : date}</span>
              </div>
              <div className="calendar-status-list">
                {statuses.length === 0 ? (
                  <span className="empty-day">No plan</span>
                ) : (
                  statuses.map((status) => (
                    <CalendarStatusRow
                      key={status.plan.id}
                      status={status}
                      onLog={onLog}
                      isTransition={transitionsToday.some((transition) => transition?.plan.id === status.plan.id)}
                    />
                  ))
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function CalendarStatusRow({
  status,
  onLog,
  isTransition,
}: {
  status: DayPlanStatus
  onLog: (log: Omit<InjectionLog, 'id' | 'createdAt'>) => Promise<void>
  isTransition: boolean
}) {
  const statusKind = getCalendarStatusKind(status)
  const canOverridePast = status.date <= todayIso() && status.cycleState !== 'upcoming'

  return (
    <div className={`calendar-status-row ${statusKind}`}>
      <div>
        <span className="status-label">{calendarStatusLabel(status)}</span>
        <strong>{status.plan.name}</strong>
        {isTransition && <em>Cycle change</em>}
      </div>
      {canOverridePast && (
        <div className="calendar-actions">
          {!status.completed && (
            <button
              type="button"
              className="primary-button mini"
              onClick={() =>
                void onLog({
                  planId: status.plan.id,
                  date: status.date,
                  status: 'completed',
                  actualDose: status.plan.dose,
                  site: status.plan.injectionSites[0],
                })
              }
            >
              <Check aria-hidden />
              Done
            </button>
          )}
          {!status.skipped && (
            <button
              type="button"
              className="ghost-button mini"
              onClick={() =>
                void onLog({
                  planId: status.plan.id,
                  date: status.date,
                  status: 'skipped',
                  actualDose: status.plan.dose,
                  site: status.plan.injectionSites[0],
                })
              }
            >
              <SkipForward aria-hidden />
              Not done
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function getCalendarStatusKind(status: DayPlanStatus) {
  if (status.completed) {
    return 'done'
  }
  if (status.skipped) {
    return 'skipped'
  }
  if (status.missed) {
    return 'missed'
  }
  if (status.due && status.overdue) {
    return 'due'
  }
  if (status.due) {
    return 'planned'
  }
  if (status.cycleState === 'off') {
    return 'off'
  }
  if (status.cycleState === 'upcoming') {
    return 'upcoming'
  }
  return 'on'
}

function calendarStatusLabel(status: DayPlanStatus) {
  if (status.completed) {
    return 'Done'
  }
  if (status.skipped) {
    return 'Skipped'
  }
  if (status.missed) {
    return 'Missed'
  }
  if (status.due && status.overdue) {
    return 'Due'
  }
  if (status.due) {
    return 'Planned'
  }
  if (status.cycleState === 'off') {
    return 'Off'
  }
  if (status.cycleState === 'upcoming') {
    return 'Starts later'
  }
  return 'On'
}

function ReconstitutionCalculator({
  plans,
  onUpdatePlan,
}: {
  plans: PlannedPeptide[]
  onUpdatePlan: (id: string, patch: Partial<PlannedPeptide>) => Promise<void>
}) {
  const [input, setInput] = useState<ReconstitutionInput>({
    vialAmount: 5,
    vialUnit: 'mg',
    bacWaterMl: 2,
    targetDose: 250,
    targetUnit: 'mcg',
    syringeUnitsPerMl: 10,
    dosesAlreadyUsed: 0,
  })
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const result = calculateReconstitution(input)

  const setNumber = (key: keyof ReconstitutionInput) => (event: ChangeEvent<HTMLInputElement>) => {
    setInput((current) => ({ ...current, [key]: Number(event.target.value) }))
  }

  return (
    <section className="screen calc-layout">
      <form className="tool-panel" onSubmit={(event) => event.preventDefault()}>
        <div className="section-heading">
          <h2>Reconstitution</h2>
          <span>No dosing recommendations</span>
        </div>
        <FormGrid>
          <label>
            Vial amount
            <input type="number" min="0" step="0.01" value={input.vialAmount} onChange={setNumber('vialAmount')} />
          </label>
          <label>
            Vial unit
            <select
              value={input.vialUnit}
              onChange={(event) => setInput((current) => ({ ...current, vialUnit: event.target.value as 'mg' | 'mcg' }))}
            >
              <option value="mg">mg</option>
              <option value="mcg">mcg</option>
            </select>
          </label>
          <label>
            Bac water mL
            <input type="number" min="0" step="0.1" value={input.bacWaterMl} onChange={setNumber('bacWaterMl')} />
          </label>
          <label>
            Target dose
            <input type="number" min="0" step="0.01" value={input.targetDose} onChange={setNumber('targetDose')} />
          </label>
          <label>
            Target unit
            <select
              value={input.targetUnit}
              onChange={(event) =>
                setInput((current) => ({ ...current, targetUnit: event.target.value as 'mg' | 'mcg' }))
              }
            >
              <option value="mcg">mcg</option>
              <option value="mg">mg</option>
            </select>
          </label>
          <label>
            Syringe units per 0.1 mL
            <input
              type="number"
              min="1"
              step="1"
              value={input.syringeUnitsPerMl}
              onChange={setNumber('syringeUnitsPerMl')}
            />
          </label>
          <label>
            Doses already used
            <input
              type="number"
              min="0"
              step="1"
              value={input.dosesAlreadyUsed}
              onChange={setNumber('dosesAlreadyUsed')}
            />
          </label>
        </FormGrid>
      </form>

      <aside className="result-panel">
        <div className="metric-grid">
          <Metric label="Concentration" value={`${formatNumber(result.concentrationMcgPerMl)} mcg/mL`} tone="cool" />
          <Metric label="Draw" value={`${formatNumber(result.drawMl, 3)} mL`} tone="warm" />
          <Metric label="Syringe" value={`${formatNumber(result.syringeUnits)} units`} tone="cool" />
          <Metric label="Doses left" value={result.remainingDoses} tone="warm" />
        </div>
        {result.warnings.length > 0 && (
          <div className="notice warning">
            {result.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}
        <label>
          Attach to plan
          <select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
            <option value="">Choose active plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="primary-button"
          disabled={!selectedPlanId || result.warnings.length > 0}
          onClick={() =>
            void onUpdatePlan(selectedPlanId, {
              calculator: result,
              dose: `${input.targetDose} ${input.targetUnit}`,
            })
          }
        >
          <FlaskConical aria-hidden />
          Attach calculation
        </button>
      </aside>
    </section>
  )
}

function SettingsView({
  settings,
  onSaveSettings,
  onRefresh,
}: {
  settings: AppSettings
  onSaveSettings: (patch: Partial<AppSettings>) => Promise<void>
  onRefresh: () => Promise<void>
}) {
  const [importMessage, setImportMessage] = useState('')

  const downloadExport = async () => {
    const data = await exportPlannerData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `peptide-planner-${todayIso()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    try {
      await importPlannerData(JSON.parse(await file.text()))
      await onRefresh()
      setImportMessage('Import complete.')
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Import failed.')
    }
  }

  return (
    <section className="screen settings-layout">
      <section className="section-band">
        <h2>Safety boundary</h2>
        <p>
          This is a planner and calculator for user-entered protocols. It does not recommend
          compounds, doses, titration, stacks, injection technique, or treatment decisions.
        </p>
        <p className="muted">
          Source templates are educational and should be verified against clinician guidance,
          product labels, and current evidence.
        </p>
      </section>

      <section className="section-band">
        <h2>Preferences</h2>
        <label>
          Preferred dose unit
          <select
            value={settings.preferredDoseUnit}
            onChange={(event) =>
              void onSaveSettings({ preferredDoseUnit: event.target.value as typeof settings.preferredDoseUnit })
            }
          >
            <option value="mcg">mcg</option>
            <option value="mg">mg</option>
            <option value="IU">IU</option>
          </select>
        </label>
        <button
          type="button"
          className="ghost-button"
          onClick={async () => {
            await requestNotificationPermission()
            await onSaveSettings({ notificationPermissionAsked: true })
          }}
        >
          <Bell aria-hidden />
          Enable browser notifications
        </button>
      </section>

      <section className="section-band">
        <h2>Backup</h2>
        <div className="button-row">
          <button type="button" className="primary-button small" onClick={() => void downloadExport()}>
            <Download aria-hidden />
            Export JSON
          </button>
          <label className="file-button">
            <Upload aria-hidden />
            Import JSON
            <input type="file" accept="application/json" onChange={(event) => void importFile(event)} />
          </label>
          <button
            type="button"
            className="ghost-button small danger-text"
            onClick={async () => {
              await clearPlannerData()
              await onRefresh()
            }}
          >
            <RotateCcw aria-hidden />
            Clear local data
          </button>
        </div>
        {importMessage && <p className="muted">{importMessage}</p>}
      </section>
    </section>
  )
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="form-grid">{children}</div>
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <section className="empty-state">
      <Activity aria-hidden />
      <h2>{title}</h2>
      <p>{body}</p>
      {actionLabel && onAction && (
        <button type="button" className="primary-button" onClick={onAction}>
          <Plus aria-hidden />
          {actionLabel}
        </button>
      )}
    </section>
  )
}

export default App
