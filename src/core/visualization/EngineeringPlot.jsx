import { normalizePlot } from "./visualizationContract.js";

const WIDTH = 720;
const HEIGHT = 360;
const MARGIN = { left: 66, right: 24, top: 42, bottom: 58 };

function ticks(min, max, count = 5) {
  if (min === max) return [min];
  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1));
}

function formatTick(value) {
  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.01)) return value.toExponential(1);
  return Number(value.toFixed(2)).toString();
}

export default function EngineeringPlot({ plot }) {
  const normalized = normalizePlot(plot);
  if (!normalized) return null;

  const points = [...normalized.series.flatMap((series) => series.points), ...normalized.markers];
  normalized.regions.forEach((region) => {
    points.push({ x: region.xMin, y: region.yMin }, { x: region.xMax, y: region.yMax });
  });
  normalized.referenceLines.forEach((line) => {
    if (line.axis === "x") points.push({ x: line.value, y: points[0]?.y ?? 0 });
    else points.push({ x: points[0]?.x ?? 0, y: line.value });
  });
  if (normalized.currentX != null) points.push({ x: normalized.currentX, y: points[0]?.y ?? 0 });
  let xMin = Math.min(...points.map((point) => point.x));
  let xMax = Math.max(...points.map((point) => point.x));
  let yMin = Math.min(...points.map((point) => point.y));
  let yMax = Math.max(...points.map((point) => point.y));
  if (xMin === xMax) [xMin, xMax] = [xMin - 1, xMax + 1];
  if (yMin === yMax) [yMin, yMax] = [yMin - 1, yMax + 1];
  const yPadding = (yMax - yMin) * 0.08;
  yMin -= yPadding;
  yMax += yPadding;

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (value) => MARGIN.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  const y = (value) => MARGIN.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;

  return (
    <section className="plot-card" aria-label={normalized.title}>
      <div className="visual-card-heading">
        <div><p className="eyebrow">Live relationship</p><h3>{normalized.title}</h3></div>
        <div className="plot-legend">
          {normalized.series.map((series) => <span key={series.label}><i style={{ background: series.color }} />{series.label}</span>)}
        </div>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby={`${normalized.id}-title ${normalized.id}-desc`}>
        <title id={`${normalized.id}-title`}>{normalized.title}</title>
        <desc id={`${normalized.id}-desc`}>{normalized.yLabel} plotted against {normalized.xLabel}</desc>
        {normalized.regions.map((region) => (
          <g key={`${region.label}-${region.xMin}-${region.yMin}`}>
            <rect
              x={x(Math.min(region.xMin, region.xMax))}
              y={y(Math.max(region.yMin, region.yMax))}
              width={Math.abs(x(region.xMax) - x(region.xMin))}
              height={Math.abs(y(region.yMax) - y(region.yMin))}
              fill={region.color}
              opacity="0.38"
            />
            <text className="plot-region-label" x={x((region.xMin + region.xMax) / 2)} y={y((region.yMin + region.yMax) / 2)} textAnchor="middle">{region.label}</text>
          </g>
        ))}
        {ticks(yMin, yMax).map((tick) => (
          <g key={`y-${tick}`}>
            <line className="plot-grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(tick)} y2={y(tick)} />
            <text className="plot-tick" x={MARGIN.left - 10} y={y(tick) + 4} textAnchor="end">{formatTick(tick)}</text>
          </g>
        ))}
        {ticks(xMin, xMax).map((tick) => (
          <g key={`x-${tick}`}>
            <line className="plot-grid" x1={x(tick)} x2={x(tick)} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} />
            <text className="plot-tick" x={x(tick)} y={HEIGHT - MARGIN.bottom + 22} textAnchor="middle">{formatTick(tick)}</text>
          </g>
        ))}
        <text className="plot-axis-label" x={MARGIN.left + plotWidth / 2} y={HEIGHT - 12} textAnchor="middle">{normalized.xLabel}</text>
        <text className="plot-axis-label" transform={`translate(18 ${MARGIN.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle">{normalized.yLabel}</text>
        {normalized.referenceLines.map((line) => (
          <g key={`${line.axis}-${line.value}-${line.label}`}>
            <line
              className="plot-reference"
              x1={line.axis === "x" ? x(line.value) : MARGIN.left}
              x2={line.axis === "x" ? x(line.value) : WIDTH - MARGIN.right}
              y1={line.axis === "y" ? y(line.value) : MARGIN.top}
              y2={line.axis === "y" ? y(line.value) : HEIGHT - MARGIN.bottom}
            />
            <text className="plot-reference-label" x={line.axis === "x" ? x(line.value) + (line.value > (xMin+xMax)/2 ? -6 : 6) : WIDTH - MARGIN.right - 4} y={line.axis === "y" ? y(line.value) - 7 : MARGIN.top + 15} textAnchor={line.axis === "x" && line.value <= (xMin+xMax)/2 ? "start" : "end"}>{line.label}</text>
          </g>
        ))}
        {normalized.currentX != null && (
          <g>
            <line className="plot-cursor" x1={x(normalized.currentX)} x2={x(normalized.currentX)} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} />
            <text className="plot-reference-label" x={x(normalized.currentX) + 6} y={MARGIN.top + 15}>{normalized.cursorLabel || "Current time"}</text>
          </g>
        )}
        {normalized.series.map((series) => (
          <g key={series.label}>
            {normalized.kind === "bar" ? series.points.map((point, index) => <rect key={index} x={x(point.x) - 16} y={Math.min(y(0), y(point.y))} width="32" height={Math.max(1, Math.abs(y(point.y) - y(0)))} fill={series.color} />) : <polyline fill="none" stroke={series.color} strokeWidth="4" strokeLinejoin="round" points={series.points.map((point) => `${x(point.x)},${y(point.y)}`).join(" ")} />}
            {series.points.filter((_, index) => series.points.length < 50 || index === 0 || index === series.points.length - 1).map((point) => <circle key={`${point.x}-${point.y}`} cx={x(point.x)} cy={y(point.y)} r="5" fill={series.color} />)}
          </g>
        ))}
        {normalized.markers.map((point, index) => <g key={`marker-${index}`}><circle cx={x(point.x)} cy={y(point.y)} r="8" fill={point.color || "#bf6138"} stroke="white" strokeWidth="3"/><text x={x(point.x) + (point.x > (xMin+xMax)/2 ? -12 : 12)} y={y(point.y) - 13 - index*12} textAnchor={point.x > (xMin+xMax)/2 ? "end" : "start"} fill={point.color || "#bf6138"} fontSize="17">{point.label}</text></g>)}
      </svg>
      <details className="plot-accessible-data"><summary>Read graph values</summary><p>{normalized.yLabel} versus {normalized.xLabel}. Values below sample the plotted series.</p><table><thead><tr><th>Series</th><th>{normalized.xLabel}</th><th>{normalized.yLabel}</th></tr></thead><tbody>{normalized.series.flatMap((series) => series.points.filter((_, i) => i % Math.max(1, Math.floor(series.points.length / 8)) === 0 || i === series.points.length - 1).map((p, i) => <tr key={`${series.label}-${i}`}><td>{series.label}</td><td>{formatTick(p.x)}</td><td>{formatTick(p.y)}</td></tr>))}</tbody></table></details>
    </section>
  );
}
