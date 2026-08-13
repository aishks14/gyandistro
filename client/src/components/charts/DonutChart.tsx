interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  size?: number;
}

const STROKE_WIDTH = 22;

/**
 * Each segment is drawn as a full circle with a dashed stroke sized to its
 * share of the total, offset to where the previous segment ended. This
 * avoids hand-computing arc path angles entirely — a well-worn SVG trick
 * that's far less error-prone than trigonometry-based arc paths.
 */
export default function DonutChart({ data, size = 180 }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return <div className="chart-empty">Nothing to show yet.</div>;
  }

  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulative = 0;

  return (
    <div className="donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <g transform={`rotate(-90 ${center} ${center})`}>
          {data.map((d, i) => {
            const fraction = d.value / total;
            const dash = fraction * circumference;
            const offset = -((cumulative / total) * circumference);
            cumulative += d.value;
            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
              >
                <title>{`${d.label}: ${d.value} (${Math.round(fraction * 100)}%)`}</title>
              </circle>
            );
          })}
        </g>
        <text x={center} y={center - 4} textAnchor="middle" className="donut-total-value">
          {total.toLocaleString('en-IN')}
        </text>
        <text x={center} y={center + 14} textAnchor="middle" className="donut-total-label">
          total
        </text>
      </svg>
      <ul className="donut-legend">
        {data.map((d, i) => (
          <li key={i}>
            <span className="donut-swatch" style={{ background: d.color }} />
            {d.label} — {d.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
