interface MetricProps {
  label: string;
  value: string | number;
  tone?: string;
}

export function Metric({ label, value, tone }: MetricProps) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
