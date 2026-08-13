interface TrendPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  data: TrendPoint[];
  color?: string;
  height?: number;
  valueSuffix?: string;
}

const WIDTH = 640;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

/** A simple trend line — publishing activity, signups, subscribers over time. */
export default function TrendChart({ data, color = '#F0A92E', height = 200, valueSuffix = '' }: TrendChartProps) {
  if (data.length === 0) {
    return <div className="chart-empty">Nothing in this window yet.</div>;
  }

  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerH = height - PAD_TOP - PAD_BOTTOM;
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  const x = (i: number) => PAD_LEFT + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD_TOP + innerH - (v / maxValue) * innerH;

  const linePoints = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const areaPoints = `${x(0)},${PAD_TOP + innerH} ${linePoints} ${x(data.length - 1)},${PAD_TOP + innerH}`;

  // Thin out x-axis labels so they don't collide when there are many points.
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  const gridLines = [0, 0.5, 1].map((frac) => PAD_TOP + innerH * frac);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="chart-svg" preserveAspectRatio="xMidYMid meet">
      {gridLines.map((gy, i) => (
        <line key={i} x1={PAD_LEFT} y1={gy} x2={WIDTH - PAD_RIGHT} y2={gy} className="chart-gridline" />
      ))}
      <text x={4} y={PAD_TOP + 4} className="chart-axis-label">
        {maxValue.toLocaleString('en-IN')}
      </text>
      <text x={4} y={PAD_TOP + innerH + 4} className="chart-axis-label">
        0
      </text>

      <polygon points={areaPoints} fill={color} opacity={0.12} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r={3} fill={color}>
            <title>{`${d.label}: ${d.value}${valueSuffix}`}</title>
          </circle>
          {i % labelEvery === 0 && (
            <text x={x(i)} y={height - 8} textAnchor="middle" className="chart-axis-label">
              {d.label.slice(5)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
