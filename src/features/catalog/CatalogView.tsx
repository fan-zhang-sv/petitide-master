import { useState, useMemo } from 'react';
import { Activity, Plus } from 'lucide-react';
import type { ProtocolTemplate, PlannedPeptide } from '../../types';
import { protocolCatalog } from '../../data/protocolCatalog';
import { EVIDENCE_LABELS, ROUTE_OPTIONS } from '../../constants';
import { PlanDialog } from './PlanDialog';

interface CatalogViewProps {
  onAddPlan: (plan: Omit<PlannedPeptide, 'id' | 'createdAt'>) => Promise<PlannedPeptide>;
}

export function CatalogView({ onAddPlan }: CatalogViewProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [route, setRoute] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [selected, setSelected] = useState<ProtocolTemplate | null>(null);

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(protocolCatalog.map((item) => item.category))).sort()],
    []
  );

  const filtered = protocolCatalog.filter((item) => {
    const searchText = [item.name, item.aliases?.join(' '), item.category, item.benefits, item.notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesQuery = searchText.includes(query.toLowerCase());
    const matchesCategory = category === 'all' || item.category === category;
    const matchesRoute = route === 'all' || item.defaultRoute === route;
    const matchesAdvanced = showAdvanced || !['advanced', 'experimental'].includes(item.evidence);
    return matchesQuery && matchesCategory && matchesRoute && matchesAdvanced;
  });

  return (
    <section className="screen">
      <div className="section-heading">
        <h2>Catalog</h2>
        <p>Browse educational templates to build your plan.</p>
      </div>
      <div className="filter-bar">
        <label>
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="BPC, GLP, sleep"
          />
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
            {ROUTE_OPTIONS.map((item) => (
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

      <div className="notice-banner">
        <Activity aria-hidden className="banner-icon" />
        <span>Community references only. Verify before use.</span>
      </div>

      <div className="catalog-grid">
        {filtered.map((item, index) => (
          <article
            key={item.id}
            className="catalog-card"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="card-title-row">
              <h3>{item.name}</h3>
              <span className={`pill ${item.evidence}`}>{EVIDENCE_LABELS[item.evidence]}</span>
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
            await onAddPlan(plan);
            setSelected(null);
          }}
        />
      )}
    </section>
  );
}
