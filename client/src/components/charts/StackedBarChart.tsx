interface StackSegment {
  name: string;
  value: number;
  color: string;
}

interface StackedRow {
  label: string;
  segments: StackSegment[];
}

interface StackedBarChartProps {
  data: StackedRow[];
}

const WIDTH = 640;
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 130;
const PAD_RIGHT = 16;

/** One row per author, one bar split by post status — the pipeline at a glance. */
export default function StackedBarChart({ data }: StackedBarChartProps) {
  if (data.length === 0) {
    return <div className="chart-empty">Nothing to show yet.</div>;
  }

  const maxTotal = Math.max(1, ...data.map((row) => row.segments.reduce((s, seg) => s + seg.value, 0)));
  const trackWidth = WIDTH - LABEL_WIDTH - PAD_RIGHT;
  const height = data.length * ROW_HEIGHT + 8;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
      {data.map((row, i) => {
        const rowY = i * ROW_HEIGHT;
        let cursor = 0;
        const total = row.segments.reduce((s, seg) => s + seg.value, 0);
        return (
          <g key={i}>
            <text x={LABEL_WIDTH - 10} y={rowY + ROW_HEIGHT / 2 + 4} textAnchor="end" className="chart-row-label">
              {row.label.length > 16 ? `${row.label.slice(0, 15)}…` : row.label}
            </text>
            <rect x={LABEL_WIDTH} y={rowY + 8} width={trackWidth} height={ROW_HEIGHT - 18} fill="var(--line-soft)" />
            {row.segments.map((seg, si) => {
              if (seg.value === 0) return null;
              const segW = (seg.value / maxTotal) * trackWidth;
              const segX = LABEL_WIDTH + (cursor / maxTotal) * trackWidth;
              cursor += seg.value;
              return (
                <rect key={si} x={segX} y={rowY + 8} width={segW} height={ROW_HEIGHT - 18} fill={seg.color}>
                  <title>{`${row.label} — ${seg.name}: ${seg.value}`}</title>
                </rect>
              );
            })}
            <text x={LABEL_WIDTH + trackWidth * (total / maxTotal) + 8} y={rowY + ROW_HEIGHT / 2 + 4} className="chart-row-value">
              {total}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
