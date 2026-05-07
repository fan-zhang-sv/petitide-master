import { useState, useMemo } from 'react';
import { Activity, ExternalLink, Plus, Search, SlidersHorizontal } from 'lucide-react';
import type { ProtocolTemplate, PlannedPeptide } from '../../types';
import { PROTOCOL_SOURCE_URL, protocolCatalog } from '../../data/protocolCatalog';
import { EVIDENCE_LABELS, ROUTE_OPTIONS } from '../../constants';
import { frequencyLabel } from '../../utils/cycleEngine';
import { PlanDialog } from './PlanDialog';

interface CatalogViewProps {
  onAddPlan: (plan: Omit<PlannedPeptide, 'id' | 'createdAt'>) => Promise<PlannedPeptide>;
}

export function CatalogView({ onAddPlan }: CatalogViewProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [route, setRoute] = useState('all');
  const [evidence, setEvidence] = useState('all');
  const [selected, setSelected] = useState<ProtocolTemplate | null>(null);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(protocolCatalog.map((item) => item.category))).sort()],
    []
  );

  const filtered = protocolCatalog.filter((item) => {
    const searchText = [
      item.id,
      item.name,
      item.aliases?.join(' '),
      item.category,
      item.typicalDose,
      item.defaultRoute,
      item.routeText,
      frequencyLabel(item.defaultFrequency),
      item.cycleText,
      item.timeOffText,
      item.benefits,
      item.notes,
      item.flags.join(' '),
      EVIDENCE_LABELS[item.evidence],
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesQuery = searchText.includes(query.toLowerCase());
    const matchesCategory = category === 'all' || item.category === category;
    const matchesRoute = route === 'all' || item.defaultRoute === route;
    const matchesEvidence = evidence === 'all' || item.evidence === evidence;
    return matchesQuery && matchesCategory && matchesRoute && matchesEvidence;
  });

  return (
    <section className="screen catalog-screen">
      <header className="catalog-topline">
        <div>
          <h2>Catalog</h2>
          <p>{filtered.length} of {protocolCatalog.length} templates</p>
        </div>
        <a className="catalog-source-link" href={PROTOCOL_SOURCE_URL} target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden />
          Source
        </a>
      </header>

      <div className="catalog-filter-panel" aria-label="Catalog filters">
        <label className="catalog-search">
          <Search aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, dose, route, benefit, flag"
          />
        </label>
        <div className="catalog-filter-grid">
          <label>
            <SlidersHorizontal aria-hidden />
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === 'all' ? 'All categories' : item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Route</span>
            <select value={route} onChange={(event) => setRoute(event.target.value)}>
              <option value="all">All routes</option>
              {ROUTE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Evidence</span>
            <select value={evidence} onChange={(event) => setEvidence(event.target.value)}>
              <option value="all">All evidence</option>
              {Object.entries(EVIDENCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="catalog-disclaimer">
        <Activity aria-hidden />
        <span>Community references only. Verify before use.</span>
      </div>

      <div className="catalog-board">
        {filtered.map((item, index) => (
          <article
            key={item.id}
            className={`catalog-row ${item.evidence}`}
            style={{ animationDelay: `${index * 28}ms` }}
          >
            <div className="catalog-row-main">
              <div className="catalog-title-line">
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    <span>{item.category}</span>
                    <span>{item.id}</span>
                    {item.aliases?.length ? <span>Aliases: {item.aliases.join(', ')}</span> : null}
                  </p>
                </div>
                <span className={`pill ${item.evidence}`}>{EVIDENCE_LABELS[item.evidence]}</span>
              </div>

              <dl className="catalog-fact-grid">
                <div>
                  <dt>Dose</dt>
                  <dd>{item.typicalDose}</dd>
                </div>
                <div>
                  <dt>Route</dt>
                  <dd>{item.defaultRoute}</dd>
                </div>
                <div>
                  <dt>Frequency</dt>
                  <dd>{frequencyLabel(item.defaultFrequency)}</dd>
                </div>
                <div>
                  <dt>Cycle</dt>
                  <dd>{item.cycleText}</dd>
                </div>
                <div>
                  <dt>Time off</dt>
                  <dd>{item.timeOffText}</dd>
                </div>
                <div>
                  <dt>Days</dt>
                  <dd>{formatCycleDays(item)}</dd>
                </div>
              </dl>

              <div className="catalog-copy-grid">
                <div>
                  <strong>Route note</strong>
                  <p>{item.routeText}</p>
                </div>
                <div>
                  <strong>Benefits</strong>
                  <p>{item.benefits}</p>
                </div>
                <div>
                  <strong>Notes</strong>
                  <p>{item.notes}</p>
                </div>
              </div>

              <div className="catalog-flag-line">
                {item.flags.map((flag) => (
                  <span key={flag}>{flag}</span>
                ))}
              </div>
            </div>

            <button type="button" className="catalog-add-button" onClick={() => setSelected(item)}>
              <Plus aria-hidden />
              Add
            </button>
          </article>
        ))}
      </div>

      {selected && (
        <PlanDialog
          template={selected}
          onClose={() => setSelected(null)}
          onAdd={async (plan) => {
            await onAddPlan(plan);
            setSelected(null);
          }}
        />
      )}
    </section>
  );
}

function formatCycleDays(item: ProtocolTemplate) {
  if (item.cycleDays && item.offDays) {
    return `${item.cycleDays} on / ${item.offDays} off`;
  }
  if (item.cycleDays) {
    return `${item.cycleDays} on / no fixed off`;
  }
  if (item.offDays) {
    return `No fixed on / ${item.offDays} off`;
  }
  return 'Text only';
}
