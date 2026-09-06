export default function VerificationPanel({ cases }) {
  const allPass = cases.every((item) => item.passed);

  return (
    <div className="subpanel verification">
      <div className="subpanel-heading">
        <h3>Verification</h3>
        <span className={`status ${allPass ? "pass" : "fail"}`}>
          {allPass ? "KNOWN CASES PASS" : "CHECK FAILED"}
        </span>
      </div>
      <ul className="check-list">
        {cases.map((item) => (
          <li key={item.label}>
            <span aria-hidden="true">{item.passed ? "✓" : "×"}</span>
            {item.label}
          </li>
        ))}
      </ul>
      <p className="caution">Passing tests supports software correctness; it does not prove the model is valid for every flight condition.</p>
    </div>
  );
}
