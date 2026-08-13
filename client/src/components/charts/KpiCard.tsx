interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  accent?: string;
}

/** A single big-number stat, the building block of every analytics view. */
export default function KpiCard({ label, value, hint, accent }: KpiCardProps) {
  return (
    <div className="kpi-card" style={accent ? { borderTopColor: accent } : undefined}>
      <div className="kpi-value">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</div>
      <div className="kpi-label">{label}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );
}
