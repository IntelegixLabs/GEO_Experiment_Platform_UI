import { useCallback, useEffect, useId, useMemo, useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import type {
  GeoOptimizationApplication,
  GeoOptimizationConfig,
  GeoOptimizationOption,
  GeoOptimizationOptions,
  GeoOptimizationScope,
  Product,
} from "../types";
import { formatNumber, titleCase } from "../utils/formatters";

const profileDescriptions: Record<string, string> = {
  factual_structure: "Conservative factual treatment with a fixed, auditable feature bundle.",
  evidence_first: "Prioritises claim-linked product evidence and decision-ready offer details.",
  balanced_retrieval: "Balances title, feature, semantic-proxy, and evidence signals for controlled retrieval.",
  custom: "Retains your chosen feature vector and transparent scoring weights.",
};

const targetDescriptions: Record<string, string> = {
  citation_visibility: "Primary target: improve retrieval and citation visibility while preserving factuality.",
  balanced_visibility: "Primary target: balance citation visibility with evidence quality and consumer-decision safeguards.",
  decision_quality: "Primary target: prioritise useful, supported, and calibrated decision information over visibility alone.",
};

const scopeDescriptions: Record<string, string> = {
  all_catalog: "All eligible catalog products",
  categories: "Only selected departments",
  product_ids: "A defined list of product records",
  pair_ids: "Matched product pairs",
};

const weightLabels: Record<string, string> = {
  title_weight: "Title and brand match",
  category_weight: "Category match",
  feature_weight: "Feature match",
  description_weight: "Description match",
  offer_weight: "Offer and policy evidence",
  semantic_weight: "Concept similarity proxy",
  evidence_match_weight: "Claim and FAQ evidence",
  max_structural_evidence_bonus: "Structured evidence ceiling",
  structural_weight: "Structured evidence",
};

const featureLabels: Record<string, string> = {
  factual_summary: "Factual summary",
  summary: "Factual summary",
  structured_specifications: "Structured specifications",
  specifications: "Structured specifications",
  claim_evidence_links: "Claim-evidence links",
  claim_blocks: "Claim-evidence blocks",
  evidence_blocks: "Claim-evidence blocks",
  factual_faq: "Decision-ready FAQ",
  faq: "Decision-ready FAQ",
  offer_details: "Offer and return details",
  agent_readable_provenance: "Entity and provenance fields",
  entity_provenance: "Entity and provenance fields",
  agent_ready_fields: "Entity and provenance fields",
};

const profileFallbacks: GeoOptimizationOption[] = [
  { value: "factual_structure", label: "Factual structure" },
  { value: "evidence_first", label: "Evidence first" },
  { value: "balanced_retrieval", label: "Balanced retrieval" },
  { value: "custom", label: "Custom profile" },
];

const strategyFallbacks: GeoOptimizationOption[] = [
  { value: "stratified_split", label: "Stratified split" },
  { value: "matched_pairs", label: "Matched pairs (50 / 50)" },
];

const scopeFallbacks: GeoOptimizationOption[] = [
  { value: "all_catalog", label: "All catalog" },
  { value: "categories", label: "Selected departments" },
  { value: "product_ids", label: "Product IDs" },
  { value: "pair_ids", label: "Matched pairs" },
];

interface GeoOptimizationPanelProps {
  categories: string[];
  products: Product[];
  onApplied?: () => Promise<void> | void;
}

function normaliseOptions(
  values: Array<GeoOptimizationOption | string> | undefined,
  fallbacks: GeoOptimizationOption[],
): GeoOptimizationOption[] {
  if (!values?.length) return fallbacks;
  return values.map((value) => (typeof value === "string" ? { value, label: titleCase(value) } : value));
}

function cloneScope(scope: GeoOptimizationScope): GeoOptimizationScope {
  return {
    type: scope.type,
    categories: [...scope.categories],
    product_ids: [...scope.product_ids],
    pair_ids: [...scope.pair_ids],
    limit: scope.limit,
  };
}

function cloneConfig(config: GeoOptimizationConfig): GeoOptimizationConfig {
  return {
    ...config,
    parameter_weights: { ...config.parameter_weights },
    feature_toggles: { ...config.feature_toggles },
    scope: cloneScope(config.scope),
  };
}

function labelForWeight(key: string, options: GeoOptimizationOptions | null): string {
  const metadata = options?.parameter_weights?.[key];
  return metadata?.label || weightLabels[key] || titleCase(key.replace(/_weight$/, ""));
}

function labelForFeature(key: string, options: GeoOptimizationOptions | null): string {
  const metadata = options?.feature_toggles?.[key];
  return metadata?.label || featureLabels[key] || titleCase(key);
}

function descriptionForFeature(key: string, options: GeoOptimizationOptions | null): string {
  return options?.feature_toggles?.[key]?.description || "Included only when it can be derived from verified catalog fields.";
}

function delimitedValues(value: string): string[] {
  return [...new Set(value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))];
}

function firstNumericValue(summary: Record<string, unknown> | null, keys: string[]): number | undefined {
  if (!summary) return undefined;
  for (const key of keys) {
    const value = summary[key];
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function formatAppliedAt(value: string | null | undefined): string {
  if (!value) return "Not applied yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function optionLabel(options: GeoOptimizationOption[], value: string): string {
  return options.find((option) => option.value === value)?.label || titleCase(value);
}

export function GeoOptimizationPanel({ categories, products, onApplied }: GeoOptimizationPanelProps) {
  const headingId = useId();
  const [draft, setDraft] = useState<GeoOptimizationConfig | null>(null);
  const [options, setOptions] = useState<GeoOptimizationOptions | null>(null);
  const [scopeSummary, setScopeSummary] = useState<Record<string, unknown> | null>(null);
  const [application, setApplication] = useState<GeoOptimizationApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [confirmReconfiguration, setConfirmReconfiguration] = useState(false);
  const [applyProgress, setApplyProgress] = useState<number>(0);
  const [applyTotal, setApplyTotal] = useState<number>(0);
  const [applyLogs, setApplyLogs] = useState<{condition: string, product: string, geo_bundle?: Record<string, any>, original_record?: Record<string, any>}[]>([]);
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);
  const [activeDesignerTab, setActiveDesignerTab] = useState<"framing" | "randomization" | "modules" | "weights" | "release">("framing");

  const refreshConfiguration = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getGeoOptimizationConfig();
      setDraft(cloneConfig(response.config));
      setOptions(response.options);
      setScopeSummary(response.scope_summary);
      setApplication(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The GEO configuration service could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshConfiguration();
  }, [refreshConfiguration]);

  const profileOptions = useMemo(() => normaliseOptions(options?.model_profiles, profileFallbacks), [options]);
  const strategyOptions = useMemo(() => normaliseOptions(options?.assignment_strategies, strategyFallbacks), [options]);
  const scopeOptions = useMemo(() => normaliseOptions(options?.scope_types, scopeFallbacks), [options]);
  const applyLimit = firstNumericValue(options as Record<string, unknown> | null, ["apply_limit"]);
  const effectiveCategories = useMemo(
    () => [...new Set([...(options?.categories || []), ...categories])].sort((left, right) => left.localeCompare(right)),
    [categories, options],
  );

  const catalogTotal = firstNumericValue(scopeSummary, ["catalog_products", "total_products", "eligible_products", "selected_products"]);
  const selectedLoadedProducts = useMemo(() => {
    if (!draft) return 0;
    if (draft.scope.type === "categories") {
      const selected = new Set(draft.scope.categories.map((category) => category.toLocaleLowerCase()));
      return products.filter((product) => selected.has(product.category.toLocaleLowerCase())).length;
    }
    if (draft.scope.type === "product_ids") {
      const selected = new Set(draft.scope.product_ids);
      return products.filter((product) => selected.has(product.id)).length;
    }
    if (draft.scope.type === "pair_ids") {
      const selected = new Set(draft.scope.pair_ids);
      return products.filter((product) => product.pair_id && selected.has(product.pair_id)).length;
    }
    return products.length;
  }, [draft, products]);

  const splitCounts = useMemo(() => {
    if (!draft) return null;
    const selected = application?.selected_products ?? (draft.scope.type === "all_catalog" ? catalogTotal : undefined);
    if (selected === undefined) return null;
    const treatment = Math.round(selected * (draft.treatment_percentage / 100));
    return { selected, treatment, control: Math.max(0, selected - treatment) };
  }, [application?.selected_products, catalogTotal, draft]);

  const validationMessage = useMemo(() => {
    if (!draft) return "";
    if (!draft.name.trim()) return "Give this configuration a short version name.";
    if (draft.scope.type === "categories" && !draft.scope.categories.length) return "Select at least one department for this scope.";
    if (draft.scope.type === "product_ids" && !draft.scope.product_ids.length) return "Provide at least one product ID for this scope.";
    if (draft.scope.type === "pair_ids" && !draft.scope.pair_ids.length) return "Provide at least one pair ID for this scope.";
    const renderedContent = ["factual_summary", "structured_specifications", "claim_evidence_links", "factual_faq"]
      .filter((key) => key in draft.feature_toggles);
    if (renderedContent.length && !renderedContent.some((key) => draft.feature_toggles[key])) {
      return "Enable at least one factual content module before creating a GEO treatment.";
    }
    if (draft.assignment_strategy === "matched_pairs" && draft.treatment_percentage !== 50) {
      return "Matched-pair allocation requires a 50 / 50 treatment split.";
    }
    return "";
  }, [draft]);

  function updateDraft(updater: (current: GeoOptimizationConfig) => GeoOptimizationConfig) {
    setDraft((current) => (current ? updater(current) : current));
    setApplication(null);
    setStatus("");
  }

  function updateScope(updater: (scope: GeoOptimizationScope) => GeoOptimizationScope) {
    updateDraft((current) => ({ ...current, scope: updater(cloneScope(current.scope)) }));
  }

  function changeScopeType(type: string) {
    updateScope((scope) => ({ ...scope, type }));
  }

  function toggleCategory(category: string) {
    updateScope((scope) => {
      const selected = new Set(scope.categories);
      if (selected.has(category)) selected.delete(category);
      else selected.add(category);
      return { ...scope, categories: [...selected].sort((left, right) => left.localeCompare(right)) };
    });
  }

  function changeTreatmentPercentage(event: ChangeEvent<HTMLInputElement>) {
    const value = Math.min(99, Math.max(1, Number(event.target.value) || 1));
    updateDraft((current) => ({
      ...current,
      treatment_percentage: current.assignment_strategy === "matched_pairs" ? 50 : value,
    }));
  }

  function changeAssignmentStrategy(value: string) {
    updateDraft((current) => ({
      ...current,
      assignment_strategy: value,
      treatment_percentage: value === "matched_pairs" ? 50 : current.treatment_percentage,
    }));
  }

  function changeWeight(key: string, value: string) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) return;
    updateDraft((current) => ({
      ...current,
      model_profile: current.model_profile === "custom" ? current.model_profile : "custom",
      parameter_weights: { ...current.parameter_weights, [key]: Math.max(0, nextValue) },
    }));
  }

  function toggleFeature(key: string) {
    updateDraft((current) => ({
      ...current,
      model_profile: current.model_profile === "custom" ? current.model_profile : "custom",
      feature_toggles: { ...current.feature_toggles, [key]: !current.feature_toggles[key] },
    }));
  }

  async function submitConfiguration(event: FormEvent<HTMLFormElement>, dryRun: boolean) {
    event.preventDefault();
    if (!draft || applying || validationMessage) return;
    setApplying(dryRun ? "preview" : "apply");
    setError("");
    setStatus("");
    try {
      const response = await api.applyGeoOptimization({
        name: draft.name.trim(),
        optimization_target: draft.optimization_target || "balanced_visibility",
        model_profile: draft.model_profile,
        model_name: draft.model_name.trim(),
        model_version: draft.model_version.trim(),
        treatment_percentage: draft.treatment_percentage,
        assignment_strategy: draft.assignment_strategy,
        random_seed: draft.random_seed.trim(),
        parameter_weights: draft.parameter_weights,
        feature_toggles: draft.feature_toggles,
        scope: cloneScope(draft.scope),
        dry_run: dryRun,
        confirm_reconfiguration: confirmReconfiguration,
      }, (progress) => {
        setApplyProgress(progress.processed);
        setApplyTotal(progress.total);
        if (progress.latest_product) {
          setApplyLogs(prev => [...prev, { condition: progress.condition, product: progress.latest_product, geo_bundle: progress.geo_bundle, original_record: progress.original_record }].slice(-100));
        }
      });
      setDraft(cloneConfig(response.config));
      setApplication(response.application);
      setScopeSummary({
        ...scopeSummary,
        selected_products: response.application.selected_products,
        geo_optimized_products: response.application.geo_optimized_products,
        control_products: response.application.control_products,
      });
      setStatus(
        dryRun
          ? "Allocation preview is ready. No product pages were changed."
          : "GEO treatment was applied and recorded as a new controlled configuration.",
      );
      if (!dryRun) await onApplied?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The GEO configuration could not be applied.");
    } finally {
      setApplying(null);
    }
  }

  if (loading && !draft) {
    return (
      <section className="panel geo-optimization-panel geo-optimization-loading" aria-busy="true" aria-labelledby={headingId}>
        <div className="geo-panel-loading-mark" aria-hidden="true">✦</div>
        <div><p className="eyebrow">Experiment designer</p><h2 id={headingId}>Preparing GEO optimization controls</h2><p>Loading the active treatment configuration and catalog scope.</p></div>
      </section>
    );
  }

  if (!draft) {
    return (
      <section className="panel geo-optimization-panel geo-optimization-unavailable" aria-labelledby={headingId}>
        <p className="eyebrow">Experiment designer</p>
        <h2 id={headingId}>GEO optimization controls are unavailable</h2>
        <p>{error || "The configuration service did not return a usable experiment setup."}</p>
        <button className="secondary-button" type="button" onClick={() => void refreshConfiguration()}>Try again</button>
      </section>
    );
  }

  const target = draft.optimization_target || "balanced_visibility";
  const weightKeys = Object.keys(draft.parameter_weights);
  const featureKeys = Object.keys(draft.feature_toggles);
  const enabledFeatureCount = featureKeys.filter((key) => draft.feature_toggles[key]).length;
  const appliedState = application
    ? application.dry_run ? "Preview calculated" : "Configuration applied"
    : draft.is_active ? "Active configuration" : "Draft configuration";

  return (
    <section className="panel geo-optimization-panel" aria-labelledby={headingId}>
      <header className="geo-optimization-heading">
        <div>
          <p className="eyebrow">Experiment designer</p>
          <h2 id={headingId}>GEO optimization studio</h2>
          <p>Define a versioned treatment before products are exposed to participants. The current generator and retrieval profiles are deterministic and auditable; they do not make external LLM calls.</p>
        </div>
        <div className="geo-configuration-state" aria-live="polite">
          <span className={application?.dry_run ? "geo-state-dot preview" : draft.is_active ? "geo-state-dot active" : "geo-state-dot"} />
          <div><strong>{appliedState}</strong><small>{draft.id || "New configuration"} · {formatAppliedAt(draft.last_applied_at)}</small></div>
        </div>
      </header>

      <div className="geo-study-guard">
        <span aria-hidden="true">⌁</span>
        <p><strong>Controlled research safeguard.</strong> The system only generates factual, source-linked structural content. It does not add superiority claims, urgency, fabricated citations, or AI-targeting instructions.</p>
      </div>

      <form onSubmit={(event) => void submitConfiguration(event, false)}>
        <nav className="geo-designer-tabs" aria-label="Experiment designer sections" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #cbd5e1' }}>
          {[
            { id: "framing", label: "01 Framing" },
            { id: "randomization", label: "02 Randomization" },
            { id: "modules", label: "03 Modules" },
            { id: "weights", label: "04 Weights" },
            { id: "release", label: "Release Gate" },
          ].map((tab) => (
            <button 
              key={tab.id}
              type="button" 
              className={`geo-designer-tab ${activeDesignerTab === tab.id ? "active" : ""}`} 
              onClick={() => setActiveDesignerTab(tab.id as any)}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'transparent',
                borderBottom: activeDesignerTab === tab.id ? '2px solid #0f766e' : '2px solid transparent',
                color: activeDesignerTab === tab.id ? '#0f766e' : '#64748b',
                fontWeight: activeDesignerTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="geo-configuration-grid">
          {activeDesignerTab === "framing" && (
            <section className="geo-config-section geo-config-foundation" aria-labelledby="geo-foundation-heading">
            <div className="geo-section-heading">
              <span className="geo-section-number">01</span>
              <div><p className="eyebrow">Study framing</p><h3 id="geo-foundation-heading">Objective and treatment profile</h3></div>
            </div>
            <div className="geo-field-grid">
              <label className="geo-field">Configuration version
                <input value={draft.name} maxLength={120} onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))} placeholder="e.g., Wave 1 factual GEO" />
              </label>
              <label className="geo-field">Primary optimization target
                <select value={target} onChange={(event) => updateDraft((current) => ({ ...current, optimization_target: event.target.value }))}>
                  <option value="citation_visibility">Citation visibility</option>
                  <option value="balanced_visibility">Balanced visibility + quality</option>
                  <option value="decision_quality">Decision quality</option>
                </select>
                <small>{targetDescriptions[target] || "Choose the outcome family to prioritise in your preregistration and evaluation plan."} This is stored with the wave; the deterministic generator uses the frozen profile, modules, and weights below.</small>
              </label>
            </div>

            <fieldset className="geo-profile-fieldset">
              <legend>Treatment generator / retrieval profile</legend>
              <div className="geo-profile-options" role="radiogroup" aria-label="Treatment generator and retrieval profile">
                {profileOptions.map((profile) => {
                  const isSelected = draft.model_profile === profile.value;
                  return (
                    <label className={"geo-profile-option" + (isSelected ? " selected" : "")} key={profile.value}>
                      <input
                        className="geo-profile-input"
                        type="radio"
                        name="model-profile"
                        value={profile.value}
                        checked={isSelected}
                        onChange={() => updateDraft((current) => ({ ...current, model_profile: profile.value }))}
                      />
                      <span className="geo-profile-icon" aria-hidden="true">{profile.value === "evidence_first" ? "◈" : profile.value === "balanced_retrieval" ? "◌" : profile.value === "custom" ? "✎" : "✦"}</span>
                      <span><strong>{profile.label || titleCase(profile.value)}</strong><small>{profile.description || profileDescriptions[profile.value] || "Transparent controlled scoring profile."}</small></span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <details className="geo-advanced-details">
              <summary>Record generator metadata</summary>
              <div className="geo-field-grid">
                <label className="geo-field">Generator / scorer name<input value={draft.model_name} maxLength={120} onChange={(event) => updateDraft((current) => ({ ...current, model_name: event.target.value }))} /></label>
                <label className="geo-field">Frozen version<input value={draft.model_version} maxLength={120} onChange={(event) => updateDraft((current) => ({ ...current, model_version: event.target.value }))} /></label>
              </div>
            </details>
          </section>
          )}

          <aside className="geo-live-preview" aria-label="Live configuration preview">
            <div className="geo-preview-orbit" aria-hidden="true"><span /><span /><span /></div>
            <p className="eyebrow">Live experiment preview</p>
            <h3>{draft.treatment_percentage}% GEO treatment</h3>
            <div className="geo-split-visual" aria-label={"Treatment allocation: " + draft.treatment_percentage + "% GEO optimized and " + (100 - draft.treatment_percentage) + "% control"}>
              <span style={{ width: draft.treatment_percentage + "%" }} />
            </div>
            <div className="geo-preview-split-labels"><span>GEO <strong>{draft.treatment_percentage}%</strong></span><span>Control <strong>{100 - draft.treatment_percentage}%</strong></span></div>
            <dl className="geo-preview-stat-list">
              <div><dt>Assignment</dt><dd>{optionLabel(strategyOptions, draft.assignment_strategy)}</dd></div>
              <div><dt>Scope</dt><dd>{scopeDescriptions[draft.scope.type] || titleCase(draft.scope.type)}</dd></div>
              <div><dt>Feature modules</dt><dd>{enabledFeatureCount} enabled</dd></div>
            </dl>
            {splitCounts ? (
              <p className="geo-preview-estimate"><strong>{formatNumber(splitCounts.treatment)}</strong> treatment / <strong>{formatNumber(splitCounts.control)}</strong> control records in the current server-scoped estimate.</p>
            ) : (
              <p className="geo-preview-estimate"><strong>{formatNumber(selectedLoadedProducts)}</strong> matching records are visible in the loaded register. The server will verify the full allocation.</p>
            )}
          </aside>
        </div>

        {activeDesignerTab === "randomization" && (
          <div className="geo-workbench-grid">
            <section className="geo-config-section" aria-labelledby="geo-design-heading">
            <div className="geo-section-heading">
              <span className="geo-section-number">02</span>
              <div><p className="eyebrow">Randomised experiment</p><h3 id="geo-design-heading">Split test and source scope</h3></div>
            </div>
            <div className="geo-field-grid">
              <label className="geo-field">Assignment design
                <select value={draft.assignment_strategy} onChange={(event) => changeAssignmentStrategy(event.target.value)}>
                  {strategyOptions.map((strategy) => <option key={strategy.value} value={strategy.value}>{strategy.label || titleCase(strategy.value)}</option>)}
                </select>
                <small>{draft.assignment_strategy === "matched_pairs" ? "Matched pairs preserve the one-control / one-treatment comparison and require a 50 / 50 split." : "Stratified allocation is calculated within the server-approved scope."}</small>
              </label>
              <label className="geo-field">Randomisation seed
                <input value={draft.random_seed} maxLength={120} onChange={(event) => updateDraft((current) => ({ ...current, random_seed: event.target.value }))} placeholder="e.g., GEO-WAVE-01" />
                <small>Record a stable seed so that an allocation can be reproduced.</small>
              </label>
            </div>

            <div className="geo-range-field">
              <div className="geo-range-label"><label htmlFor="geo-treatment-percentage">Treatment allocation</label><output>{draft.treatment_percentage}% GEO / {100 - draft.treatment_percentage}% control</output></div>
              <input id="geo-treatment-percentage" type="range" min={1} max={99} step={1} value={draft.treatment_percentage} disabled={draft.assignment_strategy === "matched_pairs"} onChange={changeTreatmentPercentage} />
              <div className="geo-range-scale" aria-hidden="true"><span>1%</span><span>50%</span><span>99%</span></div>
            </div>

            <fieldset className="geo-scope-fieldset">
              <legend>Product source scope</legend>
              <div className="geo-scope-options" role="radiogroup" aria-label="Product source scope">
                {scopeOptions.map((scope) => (
                  <label className={"geo-scope-option" + (draft.scope.type === scope.value ? " selected" : "")} key={scope.value}>
                    <input type="radio" name="scope-type" value={scope.value} checked={draft.scope.type === scope.value} onChange={() => changeScopeType(scope.value)} />
                    <span><strong>{scope.label || titleCase(scope.value)}</strong><small>{scopeDescriptions[scope.value] || "Define the records included in this experimental wave."}</small></span>
                  </label>
                ))}
              </div>
              {draft.scope.type === "categories" && (
                <div className="geo-category-selector">
                  <p>Select departments <small>{draft.scope.categories.length} selected</small></p>
                  <div className="geo-category-chips">
                    {effectiveCategories.map((category) => {
                      const selected = draft.scope.categories.includes(category);
                      return <label className={"geo-category-chip" + (selected ? " selected" : "")} key={category}><input type="checkbox" checked={selected} onChange={() => toggleCategory(category)} /><span>{category}</span></label>;
                    })}
                  </div>
                </div>
              )}
              {draft.scope.type === "product_ids" && (
                <label className="geo-field geo-scope-input">Product IDs
                  <textarea rows={3} value={draft.scope.product_ids.join("\n")} onChange={(event) => updateScope((scope) => ({ ...scope, product_ids: delimitedValues(event.target.value) }))} placeholder="One product ID per line or comma-separated" />
                  <small>Use the stable researcher product ID, not a title. {products.length ? "The loaded register currently contains " + formatNumber(products.length) + " records for reference." : ""}</small>
                </label>
              )}
              {draft.scope.type === "pair_ids" && (
                <label className="geo-field geo-scope-input">Pair IDs
                  <textarea rows={3} value={draft.scope.pair_ids.join("\n")} onChange={(event) => updateScope((scope) => ({ ...scope, pair_ids: delimitedValues(event.target.value) }))} placeholder="One matched pair ID per line or comma-separated" />
                  <small>Use matched product pairs when you need a directly comparable 50 / 50 experiment.</small>
                </label>
              )}
              <label className="geo-field geo-scope-input">Subsample Limit (optional)
                <input type="number" min="1" value={draft.scope.limit || ""} onChange={(event) => updateScope((scope) => ({ ...scope, limit: event.target.value ? parseInt(event.target.value, 10) : null }))} placeholder="e.g. 100 for a quick initial test" />
                <small>Limit the number of products processed in this wave. Leave blank to process all matching products.</small>
              </label>
            </fieldset>
          </section>
          </div>
        )}

        {activeDesignerTab === "modules" && (
          <div className="geo-workbench-grid">
            <section className="geo-config-section geo-content-controls" aria-labelledby="geo-content-heading">
            <div className="geo-section-heading">
              <span className="geo-section-number">03</span>
              <div><p className="eyebrow">Feature vector</p><h3 id="geo-content-heading">Factual GEO modules</h3></div>
            </div>
            <p className="geo-section-intro">Switch on only the structural modules you intend to test. Every enabled module must remain traceable to the canonical product record.</p>
            <div className="geo-toggle-list">
              {featureKeys.map((key) => (
                <label className="geo-toggle" key={key}>
                  <input type="checkbox" checked={Boolean(draft.feature_toggles[key])} onChange={() => toggleFeature(key)} />
                  <span className="geo-toggle-control" aria-hidden="true"><span /></span>
                  <span><strong>{labelForFeature(key, options)}</strong><small>{descriptionForFeature(key, options)}</small></span>
                </label>
              ))}
            </div>
            <div className="geo-integrity-lock"><span aria-hidden="true">⌑</span><p><strong>Integrity gate is always on.</strong> Unsupported claims, manipulation patterns, and factual drift are rejected before a treatment is released.</p></div>
          </section>
          </div>
        )}

        {activeDesignerTab === "weights" && (
          <section className="geo-config-section geo-weight-section" aria-labelledby="geo-weights-heading">
          <div className="geo-section-heading">
            <span className="geo-section-number">04</span>
            <div><p className="eyebrow">Transparent scoring</p><h3 id="geo-weights-heading">Adjust retrieval signal weights</h3></div>
          </div>
          <p className="geo-section-intro">These weights control the controlled evaluation retriever only. They are not a claim about how a public answer engine ranks products.</p>
          <div className="geo-weight-grid">
            {weightKeys.map((key) => {
              const metadata = options?.parameter_weights?.[key];
              const value = draft.parameter_weights[key];
              const maximum = metadata?.max ?? Math.max(8, Math.ceil(value + 2));
              const step = 0.01;
              return (
                <div className="geo-weight-control" key={key}>
                  <div><label htmlFor={"geo-weight-" + key}>{labelForWeight(key, options)}</label><output>{Number(value.toFixed(2))}</output></div>
                  <input id={"geo-weight-" + key} type="range" min={metadata?.min ?? 0} max={maximum} step={step} value={value} onChange={(event) => changeWeight(key, event.target.value)} />
                  <input className="geo-weight-number" type="number" min={metadata?.min ?? 0} max={maximum} step="any" value={value} aria-label={labelForWeight(key, options) + " precise value"} onChange={(event) => changeWeight(key, event.target.value)} />
                </div>
              );
            })}
          </div>
        </section>
        )}

        {activeDesignerTab === "release" && (
          <section className="geo-release-panel" aria-label="Apply GEO configuration">
          <div className="geo-release-copy">
            <p className="eyebrow">Release gate</p>
            <h3>Preview before you change the catalog</h3>
            <p>Preview calculates the server-side allocation without rewriting product records. Applying a configuration updates the selected product treatments and should happen before participant recruitment.{applyLimit ? ` Live application is limited to ${formatNumber(applyLimit)} records per wave, so narrow a large catalog by department, product ID, or matched pair.` : ""}</p>
            <label className="geo-confirmation"><input type="checkbox" checked={confirmReconfiguration} onChange={(event) => setConfirmReconfiguration(event.target.checked)} /><span>I acknowledge that changing an already exposed configuration requires a new controlled wave and a documented rationale.</span></label>
          </div>

          {Boolean(applying) && (() => {
            const limitVal = draft.scope.limit && Number(draft.scope.limit) > 0 ? Number(draft.scope.limit) : 0;
            const rawTotal = applyTotal > 0 ? applyTotal : (selectedLoadedProducts > 0 ? selectedLoadedProducts : 10);
            const totalEffective = limitVal > 0 ? Math.min(rawTotal, limitVal) : rawTotal;
            const productsLeft = Math.max(0, totalEffective - applyProgress);
            const percent = totalEffective > 0 ? Math.min(100, Math.round((applyProgress / totalEffective) * 100)) : 0;
            const latestProductTitle = applyLogs.length > 0
              ? (typeof applyLogs[applyLogs.length - 1].product === "string" ? applyLogs[applyLogs.length - 1].product : (applyLogs[applyLogs.length - 1].product as any)?.title || "")
              : "Initializing catalog treatment...";

            return (
              <div
                style={{
                  margin: "16px 0",
                  padding: "16px",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  width: "100%",
                }}
                role="status"
                aria-live="polite"
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
                      {applying === "apply" ? "Applying GEO Treatment Wave" : "Calculating Allocation Preview"}
                    </h4>
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                      {applying === "apply" ? `Progress: ${Math.min(applyProgress, totalEffective)} of ${totalEffective} records processed` : "Server-side statistical stratification"}
                    </p>
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#475569" }}>
                    {productsLeft === 0 ? "Complete" : `${productsLeft} remaining`}
                  </span>
                </div>

                <div
                  style={{
                    height: "6px",
                    width: "100%",
                    background: "#e2e8f0",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "#0f766e",
                      width: `${Math.max(5, percent)}%`,
                      transition: "width 0.3s ease",
                      borderRadius: "3px",
                    }}
                  />
                </div>

                {latestProductTitle && (
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Processing: {latestProductTitle}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="geo-release-actions">
            <button className="secondary-button" type="button" disabled={Boolean(applying) || Boolean(validationMessage)} onClick={(event) => void submitConfiguration(event as unknown as FormEvent<HTMLFormElement>, true)}>{applying === "preview" ? "Calculating preview…" : "Preview allocation"}</button>
            <button className="primary-button geo-apply-button" type="submit" disabled={Boolean(applying) || Boolean(validationMessage)}>{applying === "apply" ? "Applying GEO treatment…" : "Apply GEO optimization"}</button>
            {validationMessage && <p className="form-error" role="alert">{validationMessage}</p>}
          </div>
        </section>
        )}
      </form>

      {(error || status || application || applyLogs.length > 0 || Boolean(applying)) && (
        <div className="geo-application-result" aria-live="polite">
          {error && <p className="form-error" role="alert">{error}</p>}
          {status && applying !== "apply" && <p className="geo-application-status">{status}</p>}
          {(Boolean(applying) || applyLogs.length > 0) && (
            <div className="geo-inline-loading" style={{ marginTop: "24px" }}>
              {Boolean(applying) ? (() => {
                const limitVal = draft.scope.limit && Number(draft.scope.limit) > 0 ? Number(draft.scope.limit) : 0;
                const rawTotal = applyTotal > 0 ? applyTotal : (selectedLoadedProducts > 0 ? selectedLoadedProducts : 10);
                const totalEffective = limitVal > 0 ? Math.min(rawTotal, limitVal) : rawTotal;
                const productsLeft = Math.max(0, totalEffective - applyProgress);
                const percent = totalEffective > 0 ? Math.min(100, Math.round((applyProgress / totalEffective) * 100)) : 0;
                const latestProductTitle = applyLogs.length > 0
                  ? (typeof applyLogs[applyLogs.length - 1].product === "string" ? applyLogs[applyLogs.length - 1].product : (applyLogs[applyLogs.length - 1].product as any)?.title || "")
                  : "Initializing catalog treatment...";

                return (
                  <div
                    style={{
                      marginBottom: "20px",
                      padding: "16px",
                      borderRadius: "8px",
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                    }}
                    role="status"
                    aria-live="polite"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
                          {applying === "apply" ? "Applying GEO Treatment Wave" : "Calculating Allocation Preview"}
                        </h4>
                        <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                          {applying === "apply" ? `Progress: ${Math.min(applyProgress, totalEffective)} of ${totalEffective} records processed` : "Server-side statistical stratification"}
                        </p>
                      </div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#475569" }}>
                        {productsLeft === 0 ? "Complete" : `${productsLeft} remaining`}
                      </span>
                    </div>

                    <div
                      style={{
                        height: "6px",
                        width: "100%",
                        background: "#e2e8f0",
                        borderRadius: "3px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          background: "#0f766e",
                          width: `${Math.max(5, percent)}%`,
                          transition: "width 0.3s ease",
                          borderRadius: "3px",
                        }}
                      />
                    </div>

                    {latestProductTitle && (
                      <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        Processing: {latestProductTitle}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="geo-inline-loading-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Optimization Complete</h3>
                  <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{formatNumber(applyTotal || applyProgress)} products processed</span>
                </div>
              )}
              <div className="geo-loading-list" style={{ maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column-reverse", gap: "0.5rem", marginTop: "1rem" }}>
                {applyLogs.length === 0 ? <div className="geo-loading-list-empty">Initializing LLM...</div> : [...applyLogs].reverse().map((log, i) => {
                  const originalIndex = applyLogs.length - 1 - i;
                  const isExpanded = expandedLogIndex === originalIndex;
                  return (
                  <div key={originalIndex} className="geo-loading-list-item-container" style={{ display: "flex", flexDirection: "column", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", animation: "slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
                    <div 
                      className="geo-loading-list-item" 
                      style={{ border: "none", background: "transparent", boxShadow: "none", cursor: "pointer", margin: 0, padding: "0.85rem 1rem", display: "flex", gap: "1rem", alignItems: "center" }}
                      onClick={() => setExpandedLogIndex(isExpanded ? null : originalIndex)}
                    >
                      <span className={`geo-badge ${log.condition === 'GEO_OPTIMIZED' ? 'geo-badge-optimized' : 'geo-badge-control'}`}>
                        {log.condition === 'GEO_OPTIMIZED' ? 'GEO Optimized' : 'Control'}
                      </span>
                      <span className="geo-loading-product-title" title={log.product}>{log.product}</span>
                      <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#a0aec0" }}>{isExpanded ? "Hide Details ▲" : "View Details ▼"}</span>
                    </div>
                    {isExpanded && log.geo_bundle && log.original_record && (
                      <div className="geo-bundle-details" style={{ padding: "0 1rem 1rem 1rem", fontSize: "0.85rem", borderTop: "1px solid #edf2f7", marginTop: "0", paddingTop: "1rem" }}>
                        <h4 style={{ margin: "0 0 1rem 0", color: "#2d3748", fontSize: "0.95rem" }}>Optimization Changes</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                          {Object.entries(log.geo_bundle).map(([key, value]) => {
                            const originalValue = log.original_record?.[key] ?? (() => {
                              switch (key) {
                                case "treatment_version": return "Control (Baseline)";
                                case "summary": return log.original_record?.description || "No description provided.";
                                case "specifications": return {
                                  "Product ID": log.original_record?.id || "Not supplied",
                                  "SKU": log.original_record?.sku || "Not supplied",
                                  "Name": log.original_record?.title || "Not supplied",
                                  "Category": log.original_record?.category || "Not supplied",
                                  "Main Category": log.original_record?.main_category || "Not supplied",
                                  "Sub Category": log.original_record?.sub_category || "Not supplied",
                                  "Brand": log.original_record?.brand || "Not supplied",
                                  "Listed price": log.original_record?.price ? `₹${Number(log.original_record.price).toLocaleString('en-IN', {minimumFractionDigits: 2})}` : "Not supplied",
                                  "Actual Price": log.original_record?.actual_price ? `₹${Number(log.original_record.actual_price).toLocaleString('en-IN', {minimumFractionDigits: 2})}` : "Not supplied",
                                  "Discount Price": log.original_record?.discount_price ? `₹${Number(log.original_record.discount_price).toLocaleString('en-IN', {minimumFractionDigits: 2})}` : "Not supplied",
                                  "Ratings": log.original_record?.rating || "Not supplied",
                                  "Number of Ratings": log.original_record?.review_count || "Not supplied",
                                  "Image": log.original_record?.image_url || "Not supplied",
                                  "Link": log.original_record?.source_url || "Not supplied",
                                  "Availability": log.original_record?.availability || "Not supplied",
                                  "Shipping": log.original_record?.shipping || "Not supplied",
                                  "Returns": log.original_record?.return_policy || "Not supplied",
                                  "Rating evidence": log.original_record?.rating ? `${log.original_record.rating} out of 5 across ${log.original_record.review_count || 0} reviews` : "Not supplied"
                                };
                                case "claim_blocks": return log.original_record?.key_features?.length ? log.original_record.key_features.map((f: string) => ({ claim: f, evidence: "Original product feature" })) : "No features provided.";
                                case "faq": return "No FAQ provided in original catalog.";
                                case "evidence_markers": return "No evidence markers in original catalog.";
                                case "feature_vector": return "N/A (Control)";
                                case "content_hash": return "N/A (Control)";
                                default: return "No equivalent in original record.";
                              }
                            })();
                            return (
                              <div key={key} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div style={{ background: "#fdf8f6", border: "1px solid #fbe8e6", padding: "0.75rem", borderRadius: "6px" }}>
                                  <div style={{ fontSize: "0.7rem", fontWeight: "bold", textTransform: "uppercase", color: "#c53030", marginBottom: "0.25rem" }}>Original {key.replace(/_/g, " ")}</div>
                                  <div style={{ color: "#4a5568", whiteSpace: "pre-wrap" }}>{typeof originalValue === "string" ? originalValue : JSON.stringify(originalValue, null, 2)}</div>
                                </div>
                                <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", padding: "0.75rem", borderRadius: "6px" }}>
                                  <div style={{ fontSize: "0.7rem", fontWeight: "bold", textTransform: "uppercase", color: "#16a34a", marginBottom: "0.25rem" }}>Optimized {key.replace(/_/g, " ")}</div>
                                  <div style={{ color: "#1f2937", whiteSpace: "pre-wrap" }}>{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {isExpanded && !log.geo_bundle && log.original_record && (
                      <div className="geo-bundle-details" style={{ padding: "0 1rem 1rem 1rem", fontSize: "0.85rem", borderTop: "1px solid #edf2f7", marginTop: "0", paddingTop: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                          <h4 style={{ margin: 0, color: "#2d3748", fontSize: "0.95rem" }}>Control Group (Unmodified)</h4>
                          <span style={{ fontSize: "0.75rem", color: "#718096" }}>The original catalog record was preserved.</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem", background: "#f7fafc", padding: "1rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                          {Object.entries(log.original_record)
                            .filter(([k, v]) => v !== null && v !== "" && !["id", "image_url", "pair_id", "condition", "geo_bundle", "created_at", "updated_at"].includes(k))
                            .map(([key, value]) => (
                            <div key={key} style={{ display: "flex", gap: "1rem" }}>
                              <strong style={{ textTransform: "capitalize", color: "#4a5568", width: "120px", flexShrink: 0 }}>{key.replace(/_/g, " ")}:</strong> 
                              <span style={{ color: "#2d3748" }}>{typeof value === "string" ? value : JSON.stringify(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            </div>
          )}

          {application && applying !== "apply" && (
            <div className="geo-application-summary">
              <div><span>Scoped records</span><strong>{formatNumber(application.selected_products)}</strong></div>
              <div><span>GEO treatment</span><strong>{formatNumber(application.geo_optimized_products)}</strong></div>
              <div><span>Control</span><strong>{formatNumber(application.control_products)}</strong></div>
              <div><span>Integrity flags</span><strong>{formatNumber(application.integrity_failures)}</strong></div>
              {application.warning && <p className="geo-application-warning">{application.warning}</p>}
              {application.skipped_product_ids.length > 0 && <p className="geo-application-warning">{formatNumber(application.skipped_product_ids.length)} records were skipped by server validation.</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

