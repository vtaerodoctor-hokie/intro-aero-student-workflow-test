import { useId } from 'react';

// Presentation only. Coordinates, vectors, labels and motion are supplied by modules.
export default function TeachingDiagram({ diagram = {}, frame = {} }) {
  const arrow = useId().replaceAll(':', '');
  const [min, max] = diagram.domain || [-.7, .7];
  const x = (value) => 48 + (value - min) / (max - min) * 444;
  const center = 150;
  const pitch = -(frame.pitchRad || 0) * 180 / Math.PI;
  const roll = (frame.rollRad || 0) * 180 / Math.PI;
  const yaw = (frame.yawRad || 0) * 180 / Math.PI;
  const angle = diagram.view === 'front' ? -roll : diagram.view === 'top' ? yaw : pitch;
  const markers = diagram.markers || [];
  const vectors = diagram.vectors || [];
  const items = [...markers.map((item) => `${item.label}: ${Number(item.x).toFixed(3)} m`), ...vectors.map((item) => item.label)];
  return <section className="lab-diagram">
    <div className="lab-card-title"><h3>{diagram.title || 'Aircraft reference view'}</h3><span>{diagram.view || 'side'} view</span></div>
    <svg viewBox="0 0 540 310" role="img" aria-label={`${diagram.caption || 'Aircraft diagram'}. ${items.join('. ')}`}>
      <defs><marker id={arrow} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="context-stroke" /></marker></defs>
      <line x1="35" y1={center} x2="505" y2={center} stroke="#d6e0e4" strokeDasharray="4 5" />
      <g transform={`rotate(${angle} ${x(diagram.pivotX ?? 0)} ${center})`}>
        {diagram.view === 'top' ? <path d="M65 144L216 135L245 55L280 55L272 133L460 140Q500 150 460 160L272 167L280 245L245 245L216 165L65 156L78 216L54 216L42 150L54 84L78 84Z" fill="#e6eff1" stroke="#607a85" strokeWidth="2" /> : diagram.view === 'front' ? <g stroke="#607a85" fill="#e6eff1" strokeWidth="2"><path d="M45 153L255 143L270 82L285 143L495 153L285 164L255 164Z"/><ellipse cx="270" cy="154" rx="23" ry="30"/></g> : <path d="M48 154L67 112L84 112L92 144L349 130Q425 124 487 153Q444 174 363 167L70 166Z" fill="#e6eff1" stroke="#607a85" strokeWidth="2" />}
        {vectors.map((v, i) => <g key={i} stroke={v.color || '#c96032'}><line x1={x(v.x)} y1={center} x2={x(v.x) + (v.dx || 0)} y2={center + (v.dy || 0)} strokeWidth="3" markerEnd={`url(#${arrow})`} /><text stroke="none" fill={v.color || '#9b4723'} x={x(v.x) + (v.dx || 0) + 6} y={center + (v.dy || 0) - 9} fontSize="17">{v.label}</text></g>)}
        {markers.map((m, i) => <g key={m.label}><circle cx={x(m.x)} cy={center} r="5" fill={m.color || '#126859'} stroke="white" strokeWidth="2" /><path d={`M${x(m.x)} ${center}L${x(m.x)} ${38 + i * 25}L${38 + i * 128} ${38 + i * 25}`} fill="none" stroke={m.color || '#126859'} /><text x={38 + i * 128} y={31 + i * 25} fill={m.color || '#126859'} fontSize="17" fontWeight="600">{m.label} · {m.x.toFixed(3)} m</text></g>)}
      </g>
      {diagram.dimension && <g stroke="#516b76"><line x1={x(diagram.dimension.from)} y1="218" x2={x(diagram.dimension.to)} y2="218" markerStart={`url(#${arrow})`} markerEnd={`url(#${arrow})`}/><text stroke="none" fill="#516b76" x={(x(diagram.dimension.from) + x(diagram.dimension.to)) / 2} y="240" textAnchor="middle" fontSize="17">{diagram.dimension.label}</text></g>}
      <g stroke="#81939b" fill="#516b76" visibility={diagram.view === "front" ? "hidden" : "visible"}><line x1="440" y1="270" x2="495" y2="270" markerEnd={`url(#${arrow})`}/><text stroke="none" x="508" textAnchor="end" y="290" fontSize="15">+x nose / forward</text></g>
      {diagram.view === "front" && <text x="508" textAnchor="end" y="290" fontSize="15" fill="#516b76">⊙ +x out of page · +y left</text>}
      {diagram.annotation && <text x="30" y="273" fontSize="16" fill="#126859">{diagram.annotation}</text>}
    </svg>
    <p>{diagram.caption || 'Body frame: +x toward the nose, +y toward the right wing, +z down.'}</p>
    <details><summary>Diagram in words</summary><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul><p>Coordinates are supplied in the unchanged body frame. Aircraft outline and arrows are schematic.</p></details>
  </section>;
}
