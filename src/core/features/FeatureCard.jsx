import EngineeringDecision from "../components/EngineeringDecision.jsx";
import VerificationPanel from "../components/VerificationPanel.jsx";
import { resolveFeatureAnalysis } from "./featureContract.js";

function formatValue(result) {
  if (typeof result.value === "string") return result.value;
  const precision = Number.isInteger(result.precision) ? result.precision : 2;
  return result.value.toFixed(precision);
}

export default function FeatureCard({ feature, aircraft, analysis: suppliedAnalysis, sequence }) {
  const analysis = suppliedAnalysis || resolveFeatureAnalysis(feature, aircraft);

  return (
    <article className="feature-card">
      <header>
        <span className="feature-number">{String(sequence).padStart(2, "0")}</span>
        <div>
          <h2>{feature.title || "Unnamed analysis"}</h2>
          <p>{feature.description || "No feature description was supplied."}</p>
        </div>
      </header>

      <div className="feature-content">
        {analysis.results.map((result) => (
          <div
            className={`result-block${result.emphasis ? " primary-result" : ""}`}
            key={result.label}
          >
            <p>{result.label}</p>
            <strong>
              {formatValue(result)} {result.unit && <small>{result.unit}</small>}
            </strong>
            {result.note && <span>{result.note}</span>}
          </div>
        ))}

        <VerificationPanel cases={analysis.verificationCases} />
        <EngineeringDecision
          question={analysis.decision.question}
          interpretation={analysis.decision.interpretation}
          tone={analysis.decision.status}
        />
      </div>
    </article>
  );
}
