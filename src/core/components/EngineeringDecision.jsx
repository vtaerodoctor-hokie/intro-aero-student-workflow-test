export default function EngineeringDecision({ question, interpretation, tone = "neutral" }) {
  return (
    <div className={`subpanel decision ${tone}`}>
      <p className="eyebrow">Engineering decision enabled</p>
      <h3>{question}</h3>
      <p>{interpretation}</p>
    </div>
  );
}
