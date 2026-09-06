const MODEL_KINDS = new Set(["derived", "load", "state-model"]);

function normalizeCapability(capability, source) {
  if (typeof capability === "string" && capability.trim()) {
    return { id: capability.trim(), version: 1 };
  }
  if (!capability || typeof capability !== "object" || typeof capability.id !== "string" || !capability.id.trim()) {
    throw new TypeError(`${source} capabilities need a non-empty id.`);
  }
  const version = capability.version ?? capability.minVersion ?? 1;
  if (!Number.isInteger(version) || version < 1) {
    throw new TypeError(`${source} capability ${capability.id} needs a positive integer version.`);
  }
  return { id: capability.id.trim(), version };
}

export function normalizeCapabilities(capabilities, source = "Feature") {
  if (capabilities == null) return [];
  if (!Array.isArray(capabilities)) throw new TypeError(`${source} capabilities must be an array.`);
  const normalized = capabilities.map((capability) => normalizeCapability(capability, source));
  const ids = normalized.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) throw new TypeError(`${source} declares a capability more than once.`);
  return normalized;
}

export function validateVersion4Entry(entry) {
  const { feature, model } = entry;
  if ((feature?.contractVersion ?? 1) !== 4) return entry;
  if (!model || typeof model !== "object") throw new TypeError(`Version 4 feature ${feature.id} must export a model.`);
  if (!MODEL_KINDS.has(model.kind)) throw new TypeError(`Feature ${feature.id} has unsupported model kind: ${model.kind}.`);
  if (typeof model.evaluate !== "function") throw new TypeError(`Feature ${feature.id} model must define evaluate(runtimeContext).`);
  normalizeCapabilities(feature.requiresCapabilities, `Feature ${feature.id} required`);
  const provided = normalizeCapabilities(feature.providesCapabilities, `Feature ${feature.id} provided`);
  if (provided.length === 0) throw new TypeError(`Version 4 feature ${feature.id} must provide at least one capability.`);
  return entry;
}

export function createCapabilityRegistry(entries) {
  const issues = [];
  const providers = new Map();
  const validEntries = [];

  entries.forEach((entry) => {
    try {
      validateVersion4Entry(entry);
      if ((entry.feature?.contractVersion ?? 1) !== 4) return;
      validEntries.push(entry);
      normalizeCapabilities(entry.feature.providesCapabilities, `Feature ${entry.feature.id} provided`).forEach((capability) => {
        const existing = providers.get(capability.id);
        if (existing) {
          issues.push({
            type: "duplicate-provider",
            message: `${entry.feature.id} and ${existing.entry.feature.id} both provide ${capability.id}.`,
          });
        } else {
          providers.set(capability.id, { ...capability, entry });
        }
      });
    } catch (error) {
      issues.push({ type: "invalid-module", featureId: entry.feature?.id, message: error.message });
    }
  });

  const dependencies = new Map(validEntries.map((entry) => [entry.feature.id, []]));
  validEntries.forEach((entry) => {
    normalizeCapabilities(entry.feature.requiresCapabilities, `Feature ${entry.feature.id} required`).forEach((required) => {
      const provider = providers.get(required.id);
      if (!provider) {
        issues.push({ type: "missing-capability", featureId: entry.feature.id, capabilityId: required.id, message: `${entry.feature.id} requires ${required.id} v${required.version}.` });
      } else if (provider.version < required.version) {
        issues.push({ type: "version-mismatch", featureId: entry.feature.id, capabilityId: required.id, message: `${entry.feature.id} requires ${required.id} v${required.version}, but v${provider.version} is installed.` });
      } else if (provider.entry.feature.id !== entry.feature.id) {
        dependencies.get(entry.feature.id).push(provider.entry.feature.id);
      }
    });
  });

  const ordered = [];
  const visiting = new Set();
  const visited = new Set();
  function visit(id, path = []) {
    if (visiting.has(id)) {
      issues.push({ type: "dependency-cycle", featureId: id, message: `Capability dependency cycle: ${[...path, id].join(" → ")}.` });
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    (dependencies.get(id) || []).forEach((dependency) => visit(dependency, [...path, id]));
    visiting.delete(id);
    visited.add(id);
    const entry = validEntries.find((candidate) => candidate.feature.id === id);
    if (entry) ordered.push(entry);
  }
  validEntries.forEach((entry) => visit(entry.feature.id));

  return {
    entries,
    providers,
    orderedEntries: ordered,
    issues,
    availableCapabilities: [...providers.values()].map(({ id, version, entry }) => ({ id, version, featureId: entry.feature.id })),
  };
}

export function requirementsFor(feature, registry) {
  return normalizeCapabilities(feature?.requiresCapabilities, `Feature ${feature?.id || "unknown"} required`).map((required) => {
    const provider = registry.providers.get(required.id);
    return {
      ...required,
      satisfied: Boolean(provider && provider.version >= required.version),
      installedVersion: provider?.version,
      providerId: provider?.entry.feature.id,
    };
  });
}

export function modelsForFeature(featureId, registry) {
  const selected = new Set();
  const providerByCapability = registry.providers;
  function addEntry(entry) {
    if (!entry?.model || (entry.feature.contractVersion ?? 1) !== 4 || selected.has(entry.feature.id)) return;
    normalizeCapabilities(entry.feature.requiresCapabilities, `Feature ${entry.feature.id} required`).forEach((requirement) => {
      addEntry(providerByCapability.get(requirement.id)?.entry);
    });
    selected.add(entry.feature.id);
  }
  addEntry(registry.entries.find((entry) => entry.feature.id === featureId));
  return registry.orderedEntries.filter((entry) => selected.has(entry.feature.id));
}
