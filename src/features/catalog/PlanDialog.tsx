import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import type { ProtocolTemplate, PlannedPeptide, RouteType, FrequencyConfig } from '../../types';
import { todayIso } from '../../utils/dates';
import { ROUTE_OPTIONS } from '../../constants';
import { Button } from '../../components/ui/Button';
import { FormGrid } from '../../components/ui/FormGrid';
import { SectionHeader } from '../../components/ui/Header';
import {
  PlanDoseMathSection,
} from '../plans/PlanDoseMathSection';
import { buildDoseMathPatch, defaultDoseMathInput, getDoseMathResult } from '../plans/planDoseMath';
import styles from '../../styles/app.module.css';

const defaultSites = ['Abdomen L', 'Abdomen R', 'Thigh L', 'Thigh R'];

interface PlanDialogProps {
  template: ProtocolTemplate;
  onClose: () => void;
  onAdd: (plan: Omit<PlannedPeptide, 'id' | 'createdAt'>) => Promise<void>;
}

export function PlanDialog({
  template,
  onClose,
  onAdd,
}: PlanDialogProps) {
  const [name, setName] = useState(template.name);
  const [dose, setDose] = useState(template.typicalDose);
  const [route, setRoute] = useState<RouteType>(template.defaultRoute);
  const [frequencyKind, setFrequencyKind] = useState<FrequencyConfig['kind']>(
    template.defaultFrequency.kind
  );
  const [timesPerWeek, setTimesPerWeek] = useState(template.defaultFrequency.timesPerWeek ?? 2);
  const [startDate, setStartDate] = useState(todayIso());
  const [cycleDays, setCycleDays] = useState(template.cycleDays?.toString() ?? '');
  const [offDays, setOffDays] = useState(template.offDays?.toString() ?? '');
  const [reminderTime, setReminderTime] = useState('08:00');
  const [sites, setSites] = useState(defaultSites.join(', '));
  const [notes, setNotes] = useState(template.notes);
  const [doseMathOpen, setDoseMathOpen] = useState(false);
  const [doseMathInput, setDoseMathInput] = useState(defaultDoseMathInput);
  const [expertOpen, setExpertOpen] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const doseMathPatch = buildDoseMathPatch({
      calculatorEnabled: doseMathOpen,
      currentDose: dose,
      input: doseMathInput,
      result: getDoseMathResult(doseMathInput),
      confirmDoseSync: (targetDose, currentDose) =>
        window.confirm(`Update plan dose from ${currentDose} to ${targetDose}?`),
    });
    void onAdd({
      templateId: template.id,
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
      ...doseMathPatch,
    });
  };

  return (
    <div className={styles['dialog-backdrop']} role="presentation">
      <form className={styles.dialog} onSubmit={submit}>
        <SectionHeader
          title={`Configure ${template.name}`}
          eyebrow="Quick setup"
          actions={<Button variant="ghost" size="small" onClick={onClose}>Close</Button>}
        />
        
        <FormGrid>
           <label>
             Plan name
             <input value={name} onChange={(event) => setName(event.target.value)} required />
           </label>
           <label>
             Target dose
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

        <PlanDoseMathSection
          input={doseMathInput}
          open={doseMathOpen}
          onChange={setDoseMathInput}
          onOpenChange={setDoseMathOpen}
        />

        <details className={styles['expert-panel']} open={expertOpen} onToggle={(event) => setExpertOpen(event.currentTarget.open)}>
           <summary>Expert options</summary>
           <FormGrid>
             <label>
               Route
               <select value={route} onChange={(event) => setRoute(event.target.value as RouteType)}>
                 {ROUTE_OPTIONS.map((item) => (
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

        <Button type="submit" variant="primary">
          <Plus aria-hidden />
          Save plan
        </Button>
      </form>
    </div>
  );
}
