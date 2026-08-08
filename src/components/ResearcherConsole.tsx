import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "../api/client";
import { GeoOptimizationPanel } from "./GeoOptimizationPanel";
import { ExperimentRunsPanel } from "./ExperimentRunsPanel";
import { VectorDbInspectorPanel } from "./VectorDbInspectorPanel";
import { RespondentAnalyticsPanel } from "./RespondentAnalyticsPanel";
import { RespondentActivityPanel } from "./RespondentActivityPanel";
import type { DashboardData, ProbeResponse, Product } from "../types";
import { conditionLabel, formatNumber, formatPercent, titleCase } from "../utils/formatters";

const constructLabels: Record<string, string> = {
  recommendation_quality: "Recommendation quality",
  citation_credibility: "Citation credibility",
  trust: "Trust",
  usefulness: "Perceived usefulness",
  risk: "Perceived risk",
  purchase_intention: "Purchase intention",
};

const exportDatasets = [
  ["products", "Products"],
  ["sessions", "Sessions"],
  ["queries", "Queries"],
  ["candidates", "Candidates"],
  ["probes", "Probes"],
  ["probe_candidates", "Probe candidates"],
  ["events", "Events"],
  ["surveys", "Surveys"],
] as const;

type TabId = "experiment" | "runs" | "vectordb" | "analytics" | "respondents" | "outcomes" | "catalog" | "probes" | "exports";

import type { ReactNode } from "react";

/* ── SVG icon components for sidebar ──────────────────────── */
function IconExperiment() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M12 3v7l-5.5 8.5a2 2 0 0 0 1.7 3h7.6a2 2 0 0 0 1.7-3L12 10V3" />
      <path d="M8.5 14h7" />
    </svg>
  );
}
function IconAnalytics() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}
function IconOutcomes() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconCatalog() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function IconProbes() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
function IconExports() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconRuns() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconVectorDB() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function IconRespondents() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

interface TabDef {
  id: TabId;
  label: string;
  icon: () => ReactNode;
  description: string;
}

const tabs: TabDef[] = [
  { id: "experiment", label: "Experiment Designer", icon: IconExperiment, description: "GEO optimization studio" },
  { id: "runs", label: "Experiment Runs", icon: IconRuns, description: "Wave logs & changes" },
  { id: "vectordb", label: "Vector DB", icon: IconVectorDB, description: "Vector store & similarity" },
  { id: "analytics", label: "Analytics", icon: IconAnalytics, description: "Respondent outcomes" },
  { id: "respondents", label: "Respondent Activity", icon: IconRespondents, description: "Participant profiles & logs" },
  { id: "outcomes", label: "Outcomes", icon: IconOutcomes, description: "Metrics & engagement" },
  { id: "catalog", label: "Catalog", icon: IconCatalog, description: "Products & import" },
  { id: "probes", label: "Probes", icon: IconProbes, description: "Controlled evaluation" },
  { id: "exports", label: "Exports", icon: IconExports, description: "Download study data" },
];

interface ResearcherConsoleProps {
  categories: string[];
  onCatalogImported: () => Promise<void>;
  onReturnToCatalog?: () => void;
}

function ConditionChip({ value }: { value: string | undefined }) {
  const className = value === "GEO_OPTIMIZED" ? "treatment" : "control";
  return <span className={`condition-chip ${className}`}>{conditionLabel(value || "CONTROL")}</span>;
}

export function ResearcherConsole({ categories, onCatalogImported, onReturnToCatalog }: ResearcherConsoleProps) {
  const [activeTab, setActiveTab] = useState<TabId>("experiment");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("Select a CSV file to append products to the catalog.");
  const [probe, setProbe] = useState({
    query: "",
    probeSet: "pilot-v1",
    repetitions: 3,
    category: "",
    engineName: "Controlled catalog retrieval",
    modelVersion: "GEO-Study-Retriever/1.0",
    locale: "",
  });
  const [runningProbe, setRunningProbe] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResponse | null>(null);
  const [probeError, setProbeError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextDashboard, nextProducts] = await Promise.all([api.getDashboard(), api.getResearchProducts()]);
      setDashboard(nextDashboard);
      setProducts(nextProducts.products);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load the researcher dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function importCsv() {
    if (!csvFile || importing) {
      if (!csvFile) setImportStatus("Choose a CSV file first.");
      return;
    }
    setImporting(true);
    setImportStatus("");
    try {
      const result = await api.importProducts(await csvFile.text());
      setImportStatus(`${result.imported} product records imported: ${result.control} control, ${result.geo_optimized} GEO-optimized. ${result.message}`);
      await Promise.all([refresh(), onCatalogImported()]);
    } catch (reason) {
      setImportStatus(reason instanceof Error ? reason.message : "The product catalog could not be imported.");
    } finally {
      setImporting(false);
    }
  }

  function changeCsv(event: ChangeEvent<HTMLInputElement>) {
    setCsvFile(event.target.files?.[0] || null);
  }

  async function submitProbe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!probe.query.trim() || runningProbe) return;
    setRunningProbe(true);
    setProbeError("");
    setProbeResult(null);
    try {
      const result = await api.runProbe({
        query: probe.query.trim(),
        probe_set: probe.probeSet,
        repetitions: probe.repetitions,
        category_filter: probe.category || undefined,
        engine_name: probe.engineName,
        model_version: probe.modelVersion,
        locale: probe.locale,
      });
      setProbeResult(result);
    } catch (reason) {
      setProbeError(reason instanceof Error ? reason.message : "The controlled probe could not be run.");
    } finally {
      setRunningProbe(false);
    }
  }

  const totals = dashboard?.totals;

  function renderTabContent() {
    switch (activeTab) {
      case "experiment":
        return (
          <GeoOptimizationPanel
            categories={categories}
            products={products}
            onApplied={async () => {
              await Promise.all([refresh(), onCatalogImported()]);
            }}
          />
        );

      case "runs":
        return <ExperimentRunsPanel />;

      case "vectordb":
        return <VectorDbInspectorPanel categories={categories} />;

      case "analytics":
        return <RespondentAnalyticsPanel />;

      case "respondents":
        return <RespondentActivityPanel />;

      case "outcomes":
        return (
          <>
            <div className="metric-grid" aria-live="polite">
              {[
                ["Consented sessions", totals?.sessions],
                ["Participant queries", totals?.queries],
                ["Completed surveys", totals?.completed_surveys],
                ["Catalog products", totals?.products],
              ].map(([label, value]) => <article className="metric-card" key={label as string}><span>{label}</span><strong>{loading ? "…" : formatNumber(value as number | undefined)}</strong></article>)}
            </div>

            <div className="research-grid">
              <section className="panel">
                <div className="panel-heading"><div><p className="eyebrow">Primary GEO outcomes</p><h2>Citation and engagement by condition</h2></div></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Condition</th><th>Citations</th><th>Opportunity rate</th><th>Mean score</th><th>Reference engagement</th></tr></thead>
                    <tbody>
                      {dashboard?.by_condition.length ? dashboard.by_condition.map((row) => (
                        <tr key={row.condition}>
                          <td><ConditionChip value={row.condition} /></td>
                          <td>{formatNumber(row.citation_events)} / {formatNumber(row.candidate_opportunities)}</td>
                          <td>{formatPercent(row.citation_rate)}</td>
                          <td>{formatNumber(row.mean_retrieval_score, 2)}</td>
                          <td>{formatNumber(row.engagement_events)} ({formatNumber(row.engagement_per_citation, 2)} / citation)</td>
                        </tr>
                      )) : <tr><td colSpan={5} className="empty-cell">{loading ? "Loading data…" : "No participant search data yet."}</td></tr>}
                    </tbody>
                  </table>
                </div>
                <p className="footnote">{dashboard?.interpretation_note}</p>
              </section>

              <section className="panel">
                <div className="panel-heading"><div><p className="eyebrow">Consumer outcomes</p><h2>Questionnaire construct means</h2></div></div>
                <div className="construct-list">
                  {dashboard && Object.entries(dashboard.survey_means).length > 0
                    ? Object.entries(dashboard.survey_means).map(([name, value]) => <div key={name}><span>{constructLabels[name] || titleCase(name)}</span><strong>{formatNumber(value, 2)} <small>/ 7</small></strong></div>)
                    : <p className="muted">{loading ? "Loading questionnaire data…" : "No completed questionnaires yet."}</p>}
                </div>
              </section>
            </div>
          </>
        );

      case "catalog":
        return (
          <>
            <section className="panel import-panel researcher-import-panel">
              <div>
                <p className="eyebrow">Researcher setup</p>
                <h2>Append a product catalog</h2>
                <p>Required CSV columns: <code>title</code>, <code>category</code>. Recommended: <code>pair_id</code>, <code>price</code>, <code>description</code>, <code>key_features</code>, <code>rating</code>, <code>review_count</code>, <code>availability</code>, <code>shipping</code>, and <code>return_policy</code>.</p>
              </div>
              <div className="import-controls">
                <input type="file" accept=".csv,text/csv" onChange={changeCsv} />
                <button className="primary-button" type="button" onClick={() => void importCsv()} disabled={importing}>{importing ? "Importing…" : "Import CSV"}</button>
                <p className="footnote">{importStatus}</p>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading"><div><p className="eyebrow">Catalog integrity</p><h2>Product-treatment balance</h2></div></div>
              <div className="table-wrap"><table><thead><tr><th>Category</th><th>Condition</th><th>Products</th></tr></thead><tbody>
                {dashboard?.catalogue_balance.length ? dashboard.catalogue_balance.map((row) => <tr key={`${row.category}-${row.condition}`}><td>{row.category}</td><td><ConditionChip value={row.condition} /></td><td>{formatNumber(row.products)}</td></tr>) : <tr><td colSpan={3} className="empty-cell">{loading ? "Loading catalog…" : "No catalog products found."}</td></tr>}
              </tbody></table></div>
            </section>

            <section className="panel product-register">
              <div className="panel-heading"><div><p className="eyebrow">Audit trail</p><h2>Product register</h2></div></div>
              <div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Condition</th><th>Pair ID</th><th>Citations / opportunities</th></tr></thead><tbody>
                {products.length ? products.map((product) => <tr key={product.id}><td><strong>{product.title}</strong></td><td>{product.category}</td><td><ConditionChip value={product.condition} /></td><td>{product.pair_id || "—"}</td><td>{formatNumber(product.citations)} / {formatNumber(product.opportunities)}</td></tr>) : <tr><td colSpan={5} className="empty-cell">{loading ? "Loading product register…" : "No products found."}</td></tr>}
              </tbody></table></div>
            </section>
          </>
        );

      case "probes":
        return (
          <section className="panel probe-panel researcher-probe-panel">
            <div>
              <p className="eyebrow">Controlled evaluation mode</p>
              <h2>Run a preregistered probe</h2>
              <p>Run a fixed shopping query against the controlled catalog without participant data. Record each paraphrase and replication as a separate probe set. This supports retrieval, rank, and citation testing; it does not replace external-engine replication.</p>
            </div>
            <form className="probe-controls" onSubmit={submitProbe}>
              <label>Probe query<input required maxLength={500} value={probe.query} onChange={(event) => setProbe({ ...probe, query: event.target.value })} placeholder="e.g., Compare 750 ml insulated bottles for commuting" /></label>
              <div className="probe-row">
                <label>Probe set<input maxLength={80} value={probe.probeSet} onChange={(event) => setProbe({ ...probe, probeSet: event.target.value })} /></label>
                <label>Repetitions<input type="number" min={1} max={10} value={probe.repetitions} onChange={(event) => setProbe({ ...probe, repetitions: Number(event.target.value) || 1 })} /></label>
              </div>
              <label>Category filter<select value={probe.category} onChange={(event) => setProbe({ ...probe, category: event.target.value })}><option value="">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
              <details className="advanced-probe-options"><summary>Record engine and model metadata</summary><label>Engine name<input maxLength={120} value={probe.engineName} onChange={(event) => setProbe({ ...probe, engineName: event.target.value })} /></label><label>Model version<input maxLength={120} value={probe.modelVersion} onChange={(event) => setProbe({ ...probe, modelVersion: event.target.value })} /></label><label>Locale<input maxLength={60} value={probe.locale} onChange={(event) => setProbe({ ...probe, locale: event.target.value })} placeholder="e.g., en-IN" /></label></details>
              <button className="primary-button" type="submit" disabled={runningProbe}>{runningProbe ? "Running…" : "Run controlled probe"}</button>
              {probeError && <p className="form-error" role="alert">{probeError}</p>}
              {probeResult && <div className="probe-result"><strong>{probeResult.runs.length} controlled run(s) logged.</strong>{probeResult.runs.map((run) => <p key={run.probe_run_id}>Run {run.repetition}: {run.cited_products.join(", ") || "no citation"}</p>)}</div>}
            </form>
          </section>
        );

      case "exports":
        return (
          <section className="panel export-panel researcher-export-panel">
            <p className="eyebrow">Analysis-ready data</p>
            <h2>Export study records</h2>
            <p>Exports preserve raw interaction and candidate-level records. Remove participant codes or other potentially identifying data before sharing outside the research team.</p>
            <div className="export-buttons">{exportDatasets.map(([dataset, label]) => <a key={dataset} href={api.exportUrl(dataset)} download>{label}</a>)}</div>

            <div style={{ marginTop: "2rem" }}>
              <div className="metric-grid" aria-live="polite">
                {[
                  ["Consented sessions", totals?.sessions],
                  ["Participant queries", totals?.queries],
                  ["Completed surveys", totals?.completed_surveys],
                  ["Catalog products", totals?.products],
                ].map(([label, value]) => <article className="metric-card" key={label as string}><span>{label}</span><strong>{loading ? "…" : formatNumber(value as number | undefined)}</strong></article>)}
              </div>
            </div>
          </section>
        );
    }
  }

  const activeTabDef = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className={`researcher-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Sidebar */}
      <nav className="researcher-sidebar" aria-label="Researcher console navigation">
        <div className="researcher-sidebar-header">
          <div className="researcher-sidebar-brand">
            <span className="researcher-sidebar-logo" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </span>
            {!sidebarCollapsed && <span className="researcher-sidebar-title">Research Console</span>}
          </div>
          <button
            className="researcher-sidebar-toggle"
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarCollapsed
                ? <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
                : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
              }
            </svg>
          </button>
        </div>

        <div className="researcher-sidebar-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`researcher-sidebar-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              title={sidebarCollapsed ? tab.label : undefined}
            >
              <span className="researcher-sidebar-item-icon" aria-hidden="true">{tab.icon()}</span>
              {!sidebarCollapsed && (
                <div className="researcher-sidebar-item-text">
                  <span className="researcher-sidebar-item-label">{tab.label}</span>
                  <span className="researcher-sidebar-item-desc">{tab.description}</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {!sidebarCollapsed && (
          <div className="researcher-sidebar-footer">
            <button className="researcher-sidebar-refresh" type="button" onClick={() => void refresh()} disabled={loading}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {loading ? "Refreshing…" : "Refresh data"}
            </button>
            {onReturnToCatalog && (
              <button className="researcher-sidebar-refresh" type="button" onClick={onReturnToCatalog} style={{ marginTop: '.4rem' }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                Return to catalog
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="researcher-content">
        <header className="researcher-content-header">
          <div>
            <p className="eyebrow">{activeTabDef.description}</p>
            <h1>{activeTabDef.label}</h1>
          </div>
          {activeTab !== "experiment" && (
            <button className="secondary-button" type="button" onClick={() => void refresh()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh metrics"}
            </button>
          )}
        </header>
        <div className="local-warning"><strong>Researcher console:</strong> protect this route with your institution's approved access controls before collecting live data.</div>
        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="researcher-tab-content">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}
