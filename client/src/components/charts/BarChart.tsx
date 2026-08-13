interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  defaultColor?: string;
  valueSuffix?: string;
}

const WIDTH = 640;
const ROW_HEIGHT = 34;
const LABEL_WIDTH = 140;
const PAD_RIGHT = 48;

/**
 * Horizontal bars — reads better than vertical for named categories, since
 * text labels of varying length never collide or need rotating.
 */
export default function BarChart({ data, defaultColor = '#F0A92E', valueSuffix = '' }: BarChartProps) {
  if (data.length === 0) {
    return <div className="chart-empty">Nothing to show yet.</div>;
  }

  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const trackWidth = WIDTH - LABEL_WIDTH - PAD_RIGHT;
  const height = data.length * ROW_HEIGHT + 8;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const barW = Math.max(2, (d.value / maxValue) * trackWidth);
        const rowY = i * ROW_HEIGHT;
        return (
          <g key={i}>
            <text x={LABEL_WIDTH - 10} y={rowY + ROW_HEIGHT / 2 + 4} textAnchor="end" className="chart-row-label">
              {d.label.length > 18 ? `${d.label.slice(0, 17)}…` : d.label}
            </text>
            <rect x={LABEL_WIDTH} y={rowY + 7} width={trackWidth} height={ROW_HEIGHT - 16} fill="var(--line-soft)" />
            <rect
              x={LABEL_WIDTH}
              y={rowY + 7}
              width={barW}
              height={ROW_HEIGHT - 16}
              fill={d.color ?? defaultColor}
            >
              <title>{`${d.label}: ${d.value}${valueSuffix}`}</title>
            </rect>
            <text x={LABEL_WIDTH + barW + 8} y={rowY + ROW_HEIGHT / 2 + 4} className="chart-row-value">
              {d.value.toLocaleString('en-IN')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
