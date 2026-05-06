import { Syringe, Archive, Library, AlertTriangle, Check } from 'lucide-react';

interface OnboardingProps {
  onAccept: () => Promise<void>;
}

export function Onboarding({ onAccept }: OnboardingProps) {
  return (
    <main className="onboarding">
      <section className="onboarding-panel">
        <div className="brand-mark">
          <Syringe aria-hidden />
        </div>
        <p className="eyebrow">Petitide Master</p>
        <h1>Welcome to Petitide Master</h1>
        <div className="feature-list">
          <div className="feature-tile">
            <Archive aria-hidden className="feature-icon" />
            <div>
              <strong>Local & Private</strong>
              <span>Track protocols and math securely on your device.</span>
            </div>
          </div>
          <div className="feature-tile">
            <Library aria-hidden className="feature-icon" />
            <div>
              <strong>Community Templates</strong>
              <span>Start with references, but edit before use.</span>
            </div>
          </div>
          <div className="feature-tile warning">
            <AlertTriangle aria-hidden className="feature-icon" />
            <div>
              <strong>Not Medical Advice</strong>
              <span>Educational only. Always consult a clinician.</span>
            </div>
          </div>
        </div>
        <button type="button" className="primary-button" onClick={() => void onAccept()}>
          <Check aria-hidden />
          I understand
        </button>
      </section>
    </main>
  );
}
