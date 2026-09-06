import { useMemo, useState } from "react";
import FeatureCard from "../features/FeatureCard.jsx";
import { resolveFeatureAnalysis } from "../features/featureContract.js";
import AircraftViewport from "../visualization/AircraftViewport.jsx";
import EngineeringPlot from "../visualization/EngineeringPlot.jsx";
import { learningModeFor, learningModes } from "../data/learningModes.js";
import { buildCurriculum } from "../data/curriculum.js";
import { capabilityContext } from "../simulation/runtime.js";
import SimulationPanel, { simulationPlots, useSimulationController } from "../simulation/SimulationPanel.jsx";
import { showsSimulationResponse, simulationDisplayMode } from "../simulation/displayMode.js";
import EvidenceReport from "./EvidenceReport.jsx";
import AircraftOverview from "./AircraftOverview.jsx";
import ParameterPanel from "./ParameterPanel.jsx";
import { modelsForFeature } from "../capabilities/capabilityContract.js";

const workspacePanels = [
  { id: "aircraft", label: "Aircraft" },
  { id: "inputs", label: "Inputs" },
  { id: "outputs", label: "Outputs" },
  { id: "plots", label: "Plots" },
  { id: "response", label: "Response" },
  { id: "evidence", label: "Evidence" },
];

function statusLabel(module) {
  if (module.status === "installed" && module.runtimeReady && simulationDisplayMode(module.feature) === "analysis-only") return "Installed · capability ready";
  if (module.status === "installed" && module.runtimeReady) return "Installed · simulation ready";
  if (module.status === "installed") return "Installed analysis";
  if (module.status === "ready") return "Ready to build";
  const missing = module.requirements.filter(({ satisfied }) => !satisfied).length;
  return `Locked · ${missing} prerequisite${missing === 1 ? "" : "s"}`;
}

export default function ModuleWorkspace({ featureEntries, registry, aircraft, inputKeys, selectedId, onAircraftChange, onSelect }) {
  const curriculum = useMemo(() => buildCurriculum(featureEntries, registry), [featureEntries, registry]);
  const selectedModule = curriculum.flatMap((topic) => topic.modules).find((module) => module.feature.id === selectedId);
  const initialTopic = selectedModule?.feature.topicId || curriculum.find((topic) => topic.modules.length)?.id || curriculum[0]?.id;
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopic);
  const activeTopic = curriculum.find((topic) => topic.id === selectedTopicId) || curriculum[0];
  const topicModules = activeTopic?.modules || [];
  const activeModule = topicModules.find((module) => module.feature.id === selectedId) || topicModules[0];
  const activeFeature = activeModule?.feature;
  const activeModeId = learningModeFor(activeFeature);
  const activeMode = learningModes.find((mode) => mode.id === activeModeId);
  const visibleModules = topicModules.filter((module) => learningModeFor(module.feature) === activeModeId);
  const modelEntries = useMemo(
    () => activeModule?.entry ? modelsForFeature(activeFeature.id, registry) : [],
    [activeModule, activeFeature, registry],
  );
  const showSimulation = showsSimulationResponse(activeFeature, activeModule?.runtimeReady);
  const analysis = useMemo(() => {
    if (!activeModule?.entry || activeModule.status !== "installed") return null;
    try {
      return resolveFeatureAnalysis(activeFeature, aircraft, capabilityContext(modelEntries, aircraft, activeFeature.simulation));
    } catch {
      return resolveFeatureAnalysis(activeFeature, aircraft, {});
    }
  }, [activeModule, activeFeature, aircraft, modelEntries]);
  const simulationController = useSimulationController({ activeModule, registry, aircraft });
  const session = simulationController.session;
  const [selectedPanelId, setSelectedPanelId] = useState("aircraft");
  const livePlots = showSimulation ? simulationPlots(session) : [];
  const panelAvailability = {
    aircraft: Boolean(activeModule),
    inputs: Boolean(activeModule),
    outputs: Boolean(activeModule),
    plots: Boolean(analysis?.plots?.length),
    response: Boolean(activeModule?.status === "installed" && showSimulation),
    evidence: Boolean(activeModule?.entry),
  };
  const activePanelId = panelAvailability[selectedPanelId]
    ? selectedPanelId
    : workspacePanels.find(({ id }) => panelAvailability[id])?.id;

  function chooseTopic(topic) {
    setSelectedTopicId(topic.id);
    const first = topic.modules[0];
    if (first) onSelect(first.feature.id);
  }

  function chooseWorkspacePanel(panelId) {
    if (panelAvailability[panelId]) setSelectedPanelId(panelId);
  }

  function moveWorkspaceTab(event, currentIndex) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const availablePanels = workspacePanels.filter(({ id }) => panelAvailability[id]);
    const currentAvailableIndex = availablePanels.findIndex(({ id }) => id === workspacePanels[currentIndex].id);
    let nextIndex = currentAvailableIndex;
    if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = availablePanels.length - 1;
    else nextIndex = (currentAvailableIndex + (event.key === "ArrowRight" ? 1 : -1) + availablePanels.length) % availablePanels.length;
    const nextPanel = availablePanels[nextIndex];
    chooseWorkspacePanel(nextPanel.id);
    document.getElementById(`workspace-tab-${nextPanel.id}`)?.focus();
  }

  if (!activeTopic) return <p>No course topics are registered.</p>;

  return (
    <section className="module-workspace" aria-labelledby="modules-title">
      <aside className="module-rail">
        <p className="eyebrow">Aircraft capability map</p>
        <h2 id="modules-title">Course topics</h2>
        <div className="topic-tabs" role="tablist" aria-label="Course topics">
          {curriculum.map((topic) => (
            <button key={topic.id} type="button" role="tab" aria-selected={topic.id === activeTopic.id} className={topic.id === activeTopic.id ? "active" : ""} onClick={() => chooseTopic(topic)}>
              <strong>{topic.shortTitle}</strong><small>{topic.modules.length} modules</small>
            </button>
          ))}
        </div>
        <p className="topic-purpose">{activeTopic.description}</p>
        {topicModules.length > 0 ? (
          <>
            <div className="learning-mode-tabs" role="tablist" aria-label="Learning modes">
              {learningModes.map((mode) => {
                const firstModule = topicModules.find((module) => learningModeFor(module.feature) === mode.id);
                return (
                  <button key={mode.id} type="button" role="tab" aria-selected={mode.id === activeModeId} className={mode.id === activeModeId ? "active" : ""} disabled={!firstModule} onClick={() => firstModule && onSelect(firstModule.feature.id)}>
                    <span>{mode.number}</span><strong>{mode.title}</strong>
                  </button>
                );
              })}
            </div>
            <div className="mode-purpose"><strong>{activeMode?.question}</strong><span>{activeMode?.description}</span></div>
            <p className="module-rail-intro">Modules in this topic and mode</p>
            <div className="module-tabs" role="tablist" aria-label={`${activeTopic.title} modules`}>
              {visibleModules.map((module) => (
                <button key={module.feature.id} type="button" role="tab" aria-selected={module.feature.id === activeFeature?.id} className={`${module.feature.id === activeFeature?.id ? "active " : ""}module-${module.status}`} onClick={() => onSelect(module.feature.id)}>
                  <span>{module.descriptor?.stage ? String(module.descriptor.stage).padStart(2, "0") : "•"}</span>
                  <strong>{module.feature.title}</strong><small>{statusLabel(module)}</small>
                </button>
              ))}
            </div>
          </>
        ) : <p className="empty-topic">No public module slots have been released for this topic yet.</p>}
      </aside>

      <div className="module-stage">
        {activeModule ? (
          <>
            <header className="workspace-toolbar">
              <div>
                <p className="eyebrow">{activeTopic.shortTitle} · {activeMode?.title}</p>
                <h2>{activeFeature.title}</h2>
              </div>
              <div className="workspace-tabs" role="tablist" aria-label="Workspace panels">
                {workspacePanels.map((panel, index) => (
                  <button
                    id={`workspace-tab-${panel.id}`}
                    key={panel.id}
                    type="button"
                    role="tab"
                    aria-controls={`workspace-panel-${panel.id}`}
                    aria-selected={panel.id === activePanelId}
                    className={panel.id === activePanelId ? "active" : ""}
                    disabled={!panelAvailability[panel.id]}
                    tabIndex={panel.id === activePanelId ? 0 : -1}
                    onClick={() => chooseWorkspacePanel(panel.id)}
                    onKeyDown={(event) => moveWorkspaceTab(event, index)}
                  >{panel.label}</button>
                ))}
              </div>
            </header>

            <div id="workspace-panel-aircraft" className="workspace-panel workspace-panel-aircraft" role="tabpanel" aria-labelledby="workspace-tab-aircraft" hidden={activePanelId !== "aircraft"}>
              <AircraftViewport aircraft={aircraft} scene={analysis?.scene} attitude={showSimulation ? session?.state : null} />
              <AircraftOverview aircraft={aircraft} parameterKeys={inputKeys} />
              {panelAvailability.response && <SimulationPanel controller={simulationController} compact idSuffix="aircraft" />}
            </div>

            <div id="workspace-panel-inputs" className="workspace-panel" role="tabpanel" aria-labelledby="workspace-tab-inputs" hidden={activePanelId !== "inputs"}>
              <ParameterPanel aircraft={aircraft} onChange={onAircraftChange} inputKeys={inputKeys} />
            </div>

            <div id="workspace-panel-outputs" className="workspace-panel" role="tabpanel" aria-labelledby="workspace-tab-outputs" hidden={activePanelId !== "outputs"}>
              {activeModule.entry ? (
                <FeatureCard feature={activeFeature} aircraft={aircraft} analysis={analysis} sequence={activeModule.descriptor?.stage || visibleModules.findIndex((module) => module.feature.id === activeFeature.id) + 1} />
              ) : (
                <article className={`planned-module planned-${activeModule.status}`}>
                  <p className="eyebrow">{activeModule.status === "ready" ? "Prerequisites satisfied" : "Capability locked"}</p>
                  <h2>{activeFeature.title}</h2><p>{activeFeature.description}</p>
                  <code>src/student/features/{activeFeature.id}.feature.js</code>
                  {activeModule.requirements.length > 0 && <div className="prerequisite-list"><strong>Required capabilities</strong><ul>{activeModule.requirements.map((requirement) => <li key={requirement.id} className={requirement.satisfied ? "satisfied" : "missing"}>{requirement.satisfied ? "✓" : "○"} {requirement.id} v{requirement.version}</li>)}</ul></div>}
                  <p>The public shell contains no solution equations or reference output. Build the normal three student-owned files during the lesson; discovery replaces this slot automatically.</p>
                </article>
              )}
            </div>

            {panelAvailability.plots && <div id="workspace-panel-plots" className="workspace-panel workspace-panel-plots" role="tabpanel" aria-labelledby="workspace-tab-plots" hidden={activePanelId !== "plots"}>
              {analysis.plots.map((plot) => <EngineeringPlot key={plot.id || plot.title} plot={plot} />)}
            </div>}

            {panelAvailability.response && <div id="workspace-panel-response" className="workspace-panel workspace-panel-response" role="tabpanel" aria-labelledby="workspace-tab-response" hidden={activePanelId !== "response"}>
              <SimulationPanel controller={simulationController} idSuffix="response" />
              {livePlots.length > 0 ? livePlots.map((plot) => <EngineeringPlot key={plot.id} plot={plot} />) : <div className="workspace-empty"><p className="eyebrow">Response history</p><h3>Run or step the model to create a plot.</h3><p>The aircraft view uses the same state history, so the motion and graph stay synchronized.</p></div>}
            </div>}

            {panelAvailability.evidence && <div id="workspace-panel-evidence" className="workspace-panel" role="tabpanel" aria-labelledby="workspace-tab-evidence" hidden={activePanelId !== "evidence"}>
              <EvidenceReport aircraft={aircraft} activeModule={activeModule} registry={registry} analysis={analysis} session={showSimulation ? session : null} />
            </div>}
          </>
        ) : (
          <article className="planned-module empty-stage"><p className="eyebrow">Topic space reserved</p><h2>{activeTopic.title}</h2><p>{activeTopic.description}</p><p>Future modules can join the same aircraft and capability graph without changing the application architecture.</p></article>
        )}
      </div>
    </section>
  );
}
