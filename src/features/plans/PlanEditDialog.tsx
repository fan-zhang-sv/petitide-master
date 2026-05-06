import { useState, type FormEvent } from 'react';
import type { PlannedPeptide, RouteType, FrequencyConfig } from '../../types';
import { ROUTE_OPTIONS } from '../../constants';
import { FormGrid } from '../../components/ui/FormGrid';

interface PlanEditDialogProps {
  plan: PlannedPeptide;
  onClose: () => void;
  onSave: (patch: Partial<PlannedPeptide>) => Promise<void>;
}

export function PlanEditDialog({
  plan,
  onClose,
  onSave,
}: PlanEditDialogProps) {
  const [name, setName] = useState(plan.name);
  const [dose, setDose] = useState(plan.dose);
  const [route, setRoute] = useState<RouteType>(plan.route);
  const [frequencyKind, setFrequencyKind] = useState<FrequencyConfig['kind']>(
    plan.frequency.kind
  );
  const [timesPerWeek, setTimesPerWeek] = useState(plan.frequency.timesPerWeek ?? 2);
  const [startDate, setStartDate] = useState(plan.startDate);
  const [cycleDays, setCycleDays] = useState(plan.cycleDays?.toString() ?? '');
  const [offDays, setOffDays] = useState(plan.offDays?.toString() ?? '');
  const [reminderTime, setReminderTime] = useState(plan.reminderTime ?? '08:00');
  const [sites, setSites] = useState(plan.injectionSites.join(', '));
  const [notes, setNotes] = useState(plan.notes ?? '');
  const [expertOpen, setExpertOpen] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
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
    });
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <form className="dialog" onSubmit={submit}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Editing protocol</p>
            <h2>{plan.name}</h2>
          </div>
          <button type="button" className="ghost-button small" onClick={onClose}>
            Cancel
          </button>
        </div>
        
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

        <details className="expert-panel" open={expertOpen} onToggle={(event) => setExpertOpen(event.currentTarget.open)}>
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

        <button type="submit" className="primary-button">
          Save changes
        </button>
      </form>
    </div>
  );
}
