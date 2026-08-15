import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "../api/client";
import { GeoOptimizationPanel } from "./GeoOptimizationPanel";
import { ExperimentRunsPanel } from "./ExperimentRunsPanel";
import { VectorDbInspectorPanel } from "./VectorDbInspectorPanel";
import { RespondentAnalyticsPanel } from "./RespondentAnalyticsPanel";
import { RespondentActivityPanel } from "./RespondentActivityPanel";
import { AgenticGeoLab } from "./AgenticGeoLab";
import type { DashboardData, ProbeResponse, Product } from "../types";
import { conditionLabel, formatNumber, formatPercent, titleCase } from "../utils/formatters";

const constructLabels: Record<string, string> = {
  recommendation_quality: "Perceived Recommendation Quality (RQ)",
  relevance_accuracy: "Perceived Relevance / Accuracy (RA)",
  usefulness: "Perceived Usefulness (PU)",
  trust: "Trust in AI Recommendation (TR)",
  decision_satisfaction: "Decision-Making Satisfaction (DS)",
  agent_satisfaction: "Recommendation-Agent Satisfaction (RS)",
  purchase_intention: "Purchase Intention (PI)",
  reuse_intention: "Intention to Reuse AI Recommendation (RI)",
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

type TabId = "experiment" | "runs" | "vectordb" | "analytics" | "respondents" | "outcomes" | "catalog" | "evaluation_lab" | "exports";

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

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
  { id: "evaluation_lab", label: "Evaluation Lab", icon: IconSearch, description: "Test per-product strategies & probes" },
  { id: "catalog", label: "Catalog", icon: IconCatalog, description: "Products & import" },
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
  const [productPage, setProductPage] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const PRODUCTS_PER_PAGE = 10;
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

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextDashboard = await api.getDashboard();
      setDashboard(nextDashboard);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load the researcher dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const nextProducts = await api.getResearchProducts(PRODUCTS_PER_PAGE, productPage * PRODUCTS_PER_PAGE);
      setProducts(nextProducts.products);
      setTotalProducts(nextProducts.total);
    } catch (reason) {
      console.error(reason);
    }
  }, [productPage]);

  useEffect(() => { void refreshDashboard(); }, [refreshDashboard]);
  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

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
      await Promise.all([refreshDashboard(), fetchProducts(), onCatalogImported()]);
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
              await Promise.all([refreshDashboard(), fetchProducts(), onCatalogImported()]);
            }}
          />
        );

      case "evaluation_lab":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <AgenticGeoLab products={products} />
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
              </form>
              {probeResult && (
                <div className="probe-result probe-analytics-dashboard" style={{ gridColumn: "1 / -1", marginTop: "1rem" }}>
                    {(() => {
                      // ── Aggregate stats ──
                      let geoCount = 0;
                      let controlCount = 0;
                      let otherCount = 0;
                      const geoProducts: Map<string, { title: string; ranks: number[]; scores: number[]; citedCount: number; category: string }> = new Map();
                      const controlProducts: Map<string, { title: string; ranks: number[]; scores: number[]; citedCount: number; category: string }> = new Map();
                      const geoRanks: number[] = [];
                      const controlRanks: number[] = [];

                      probeResult.runs.forEach(run => {
                        (run.cited_conditions || []).forEach(condition => {
                          if (condition === "GEO_OPTIMIZED") geoCount++;
                          else if (condition === "CONTROL") controlCount++;
                          else otherCount++;
                        });
                        (run.candidates || []).forEach(c => {
                          const bucket = c.condition === "GEO_OPTIMIZED" ? geoProducts : controlProducts;
                          const existing = bucket.get(c.product_id) || { title: c.title, ranks: [], scores: [], citedCount: 0, category: c.category };
                          existing.ranks.push(c.rank_position);
                          existing.scores.push(c.retrieval_score);
                          if (c.cited) existing.citedCount++;
                          bucket.set(c.product_id, existing);
                          if (c.cited) {
                            if (c.condition === "GEO_OPTIMIZED") geoRanks.push(c.rank_position);
                            else if (c.condition === "CONTROL") controlRanks.push(c.rank_position);
                          }
                        });
                      });

                      const totalCitations = geoCount + controlCount + otherCount;
                      const geoPct = totalCitations ? Math.round((geoCount / totalCitations) * 100) : 0;
                      const controlPct = totalCitations ? Math.round((controlCount / totalCitations) * 100) : 0;
                      const avgGeoRank = geoRanks.length ? (geoRanks.reduce((a, b) => a + b, 0) / geoRanks.length) : null;
                      const avgControlRank = controlRanks.length ? (controlRanks.reduce((a, b) => a + b, 0) / controlRanks.length) : null;

                      const maxScore = Math.max(
                        ...probeResult.runs.flatMap(r => (r.candidates || []).map(c => c.retrieval_score)),
                        1
                      );

                      return (
                        <>
                          {/* ── Section 1: Summary header ── */}
                          <div className="probe-summary-header">
                            <h3>Probe Analysis Report</h3>
                            <p className="probe-meta">{probeResult.runs.length} run(s) · Query: <em>"{probeResult.query}"</em></p>
                          </div>

                          {/* ── Section 2: Key metrics cards ── */}
                          <div className="probe-metrics-row">
                            <div className="probe-metric-card probe-metric-geo">
                              <span className="probe-metric-label">GEO Optimized Citations</span>
                              <strong className="probe-metric-value">{geoCount}</strong>
                              <span className="probe-metric-pct">{geoPct}%</span>
                            </div>
                            <div className="probe-metric-card probe-metric-control">
                              <span className="probe-metric-label">Control Citations</span>
                              <strong className="probe-metric-value">{controlCount}</strong>
                              <span className="probe-metric-pct">{controlPct}%</span>
                            </div>
                            <div className="probe-metric-card">
                              <span className="probe-metric-label">Avg GEO Rank</span>
                              <strong className="probe-metric-value">{avgGeoRank !== null ? `#${avgGeoRank.toFixed(1)}` : "—"}</strong>
                            </div>
                            <div className="probe-metric-card">
                              <span className="probe-metric-label">Avg Control Rank</span>
                              <strong className="probe-metric-value">{avgControlRank !== null ? `#${avgControlRank.toFixed(1)}` : "—"}</strong>
                            </div>
                          </div>

                          {/* ── Section 3: Citation split bar ── */}
                          {totalCitations > 0 && (
                            <div className="probe-section">
                              <h4>Citation Split</h4>
                              <p className="probe-explanation">
                                When the AI answered your question, it recommended products to the user. This chart shows the proportion of those recommendations that came from your optimized products vs the untouched control products.
                                {geoPct > controlPct
                                  ? " Your optimization strategy is working — the AI is preferring your optimized products."
                                  : geoPct < controlPct
                                  ? " The control group is being cited more often. Consider adjusting your optimization strategy."
                                  : " The two groups are performing equally."}
                              </p>
                              <div className="probe-split-bar">
                                {geoCount > 0 && <div className="probe-split-geo" style={{ width: `${(geoCount / totalCitations) * 100}%` }}>{geoPct}% GEO</div>}
                                {controlCount > 0 && <div className="probe-split-control" style={{ width: `${(controlCount / totalCitations) * 100}%` }}>{controlPct}% Control</div>}
                              </div>
                            </div>
                          )}

                          {/* ── Section 4: Average rank comparison ── */}
                          {(avgGeoRank !== null || avgControlRank !== null) && (
                            <div className="probe-section">
                              <h4>Average Rank When Cited</h4>
                              <p className="probe-explanation">
                                A lower rank number means the product appeared higher (closer to #1) in the AI's response. Think of it like a race — position #1 is the winner.
                              </p>
                              <div className="probe-rank-bars">
                                {avgGeoRank !== null && (
                                  <div className="probe-rank-row">
                                    <span className="probe-rank-label">GEO Optimized</span>
                                    <div className="probe-rank-track">
                                      <div className="probe-rank-fill probe-rank-geo" style={{ width: `${Math.min((avgGeoRank / 10) * 100, 100)}%` }}>
                                        #{avgGeoRank.toFixed(1)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {avgControlRank !== null && (
                                  <div className="probe-rank-row">
                                    <span className="probe-rank-label">Control</span>
                                    <div className="probe-rank-track">
                                      <div className="probe-rank-fill probe-rank-control" style={{ width: `${Math.min((avgControlRank / 10) * 100, 100)}%` }}>
                                        #{avgControlRank.toFixed(1)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ── Section 5: Per-run breakdown ── */}
                          {probeResult.runs.map((run) => (
                            <details key={run.probe_run_id} className="probe-run-detail" open={probeResult.runs.length <= 3}>
                              <summary className="probe-run-summary">
                                <span>Run {run.repetition}</span>
                                <span className="probe-run-cited-count">{run.cited_products.length} product(s) cited</span>
                              </summary>
                              <div className="probe-run-body">
                                {/* AI Answer */}
                                {run.answer && (
                                  <div className="probe-ai-answer">
                                    <h5>AI's Answer</h5>
                                    <p>{run.answer}</p>
                                  </div>
                                )}

                                {/* Candidate ranking table */}
                                {run.candidates && run.candidates.length > 0 && (
                                  <div className="probe-candidates-section">
                                    <h5>Product Ranking</h5>
                                    <p className="probe-explanation">
                                      These are the top products the AI considered, ordered by their relevance score. Products highlighted in <strong style={{ color: "var(--color-primary)" }}>green</strong> are GEO optimized; <strong style={{ color: "#6b7280" }}>gray</strong> ones are control. A "Yes" means the AI actually cited (recommended) that product in its answer.
                                    </p>
                                    <div className="probe-candidates-table">
                                      <div className="probe-candidate-header">
                                        <span className="probe-col-rank">#</span>
                                        <span className="probe-col-product">Product</span>
                                        <span className="probe-col-condition">Group</span>
                                        <span className="probe-col-score">Relevance Score</span>
                                        <span className="probe-col-cited">Cited?</span>
                                      </div>
                                      {run.candidates.map((c) => (
                                        <div key={`${run.probe_run_id}-${c.product_id}`} className={`probe-candidate-row ${c.condition === "GEO_OPTIMIZED" ? "probe-row-geo" : "probe-row-control"} ${c.cited ? "probe-row-cited" : ""}`}>
                                          <span className="probe-col-rank">{c.rank_position}</span>
                                          <span className="probe-col-product" title={c.title}>{c.title.length > 60 ? c.title.substring(0, 57) + "…" : c.title}</span>
                                          <span className={`probe-col-condition probe-condition-chip ${c.condition === "GEO_OPTIMIZED" ? "chip-geo" : "chip-control"}`}>
                                            {c.condition === "GEO_OPTIMIZED" ? "GEO" : "Control"}
                                          </span>
                                          <span className="probe-col-score">
                                            <span className="probe-score-bar-track">
                                              <span className={`probe-score-bar-fill ${c.condition === "GEO_OPTIMIZED" ? "fill-geo" : "fill-control"}`} style={{ width: `${(c.retrieval_score / maxScore) * 100}%` }}></span>
                                            </span>
                                            <span className="probe-score-num">{c.retrieval_score.toFixed(1)}</span>
                                          </span>
                                          <span className="probe-col-cited">{c.cited ? "Yes" : "—"}</span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Score breakdown mini-chart */}
                                    <details className="probe-score-breakdown">
                                      <summary>View detailed score breakdown</summary>
                                      <div className="probe-breakdown-grid">
                                        {run.candidates.filter(c => c.cited).map(c => (
                                          <div key={`breakdown-${run.probe_run_id}-${c.product_id}`} className="probe-breakdown-item">
                                            <span className="probe-breakdown-title" title={c.title}>{c.title.length > 40 ? c.title.substring(0, 37) + "…" : c.title}</span>
                                            <div className="probe-breakdown-bars">
                                              <div className="probe-breakdown-row">
                                                <span>Lexical</span>
                                                <div className="probe-breakdown-track"><div className="probe-breakdown-fill fill-lexical" style={{ width: `${maxScore ? (c.lexical_score / maxScore) * 100 : 0}%` }}></div></div>
                                                <span>{c.lexical_score.toFixed(1)}</span>
                                              </div>
                                              <div className="probe-breakdown-row">
                                                <span>Semantic</span>
                                                <div className="probe-breakdown-track"><div className="probe-breakdown-fill fill-semantic" style={{ width: `${maxScore ? (c.semantic_score / maxScore) * 100 : 0}%`, background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }}></div></div>
                                                <span>{c.semantic_score.toFixed(1)}</span>
                                              </div>
                                              <div className="probe-breakdown-row">
                                                <span>Evidence</span>
                                                <div className="probe-breakdown-track"><div className="probe-breakdown-fill fill-evidence" style={{ width: `${maxScore ? (c.evidence_score / maxScore) * 100 : 0}%` }}></div></div>
                                                <span>{c.evidence_score.toFixed(1)}</span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  </div>
                                )}
                              </div>
                            </details>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}
            </section>
          </div>
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
                <div className="panel-heading"><div><p className="eyebrow">Primary GEO outcomes</p><h2>Performance by Condition</h2></div></div>
                {dashboard?.by_condition.length ? (() => {
                  const geoRow = dashboard.by_condition.find(r => r.condition === "GEO_OPTIMIZED");
                  const controlRow = dashboard.by_condition.find(r => r.condition === "CONTROL");
                  
                  if (!geoRow || !controlRow) {
                    return <div className="empty-cell" style={{ padding: "2rem" }}>Insufficient data to compare GEO vs Control.</div>;
                  }

                  const totalCitations = geoRow.citation_events + controlRow.citation_events;
                  const geoPct = totalCitations ? Math.round((geoRow.citation_events / totalCitations) * 100) : 0;
                  const controlPct = totalCitations ? Math.round((controlRow.citation_events / totalCitations) * 100) : 0;
                  
                  // Max limits for scales
                  const maxOppRate = Math.max(geoRow.citation_rate || 0, controlRow.citation_rate || 0) || 1;
                  const maxEng = Math.max(geoRow.engagement_per_citation || 0, controlRow.engagement_per_citation || 0) || 1;

                  return (
                    <div className="outcomes-dashboard">
                      <div className="probe-section outcomes-section">
                        <h4>1. Overall Performance (Total Citations)</h4>
                        <p className="probe-explanation">How often did the AI recommend products from each group?</p>
                        <div className="probe-split-bar">
                          {geoPct > 0 && <div className="probe-split-geo" style={{ width: `${geoPct}%` }}>{geoPct}% GEO ({formatNumber(geoRow.citation_events)})</div>}
                          {controlPct > 0 && <div className="probe-split-control" style={{ width: `${controlPct}%` }}>{controlPct}% Control ({formatNumber(controlRow.citation_events)})</div>}
                          {totalCitations === 0 && <div className="probe-split-control" style={{ width: "100%", background: "#e5e7eb", color: "#6b7280" }}>No citations yet</div>}
                        </div>
                      </div>

                      <div className="probe-section outcomes-section">
                        <h4>2. Opportunity Rate (Visibility)</h4>
                        <p className="probe-explanation">When a product was relevant to a user's search, how often did the AI actually recommend it?</p>
                        <div className="probe-rank-bars">
                          <div className="probe-rank-row">
                            <span className="probe-rank-label">GEO Optimized</span>
                            <div className="probe-rank-track">
                              <div className="probe-rank-fill probe-rank-geo" style={{ width: `${((geoRow.citation_rate || 0) / maxOppRate) * 100}%` }}>
                                {formatPercent(geoRow.citation_rate)}
                              </div>
                            </div>
                            <span className="outcomes-fraction">({formatNumber(geoRow.citation_events)} / {formatNumber(geoRow.candidate_opportunities)})</span>
                          </div>
                          <div className="probe-rank-row">
                            <span className="probe-rank-label">Control</span>
                            <div className="probe-rank-track">
                              <div className="probe-rank-fill probe-rank-control" style={{ width: `${((controlRow.citation_rate || 0) / maxOppRate) * 100}%` }}>
                                {formatPercent(controlRow.citation_rate)}
                              </div>
                            </div>
                            <span className="outcomes-fraction">({formatNumber(controlRow.citation_events)} / {formatNumber(controlRow.candidate_opportunities)})</span>
                          </div>
                        </div>
                      </div>

                      <div className="probe-section outcomes-section">
                        <h4>3. User Engagement</h4>
                        <p className="probe-explanation">When a product was recommended, how often did users actually interact with it?</p>
                        <div className="probe-rank-bars">
                          <div className="probe-rank-row">
                            <span className="probe-rank-label">GEO Optimized</span>
                            <div className="probe-rank-track">
                              <div className="probe-rank-fill probe-rank-geo" style={{ width: `${((geoRow.engagement_per_citation || 0) / maxEng) * 100}%` }}>
                                {formatNumber(geoRow.engagement_per_citation, 2)} / citation
                              </div>
                            </div>
                            <span className="outcomes-fraction">({formatNumber(geoRow.engagement_events)} total)</span>
                          </div>
                          <div className="probe-rank-row">
                            <span className="probe-rank-label">Control</span>
                            <div className="probe-rank-track">
                              <div className="probe-rank-fill probe-rank-control" style={{ width: `${((controlRow.engagement_per_citation || 0) / maxEng) * 100}%` }}>
                                {formatNumber(controlRow.engagement_per_citation, 2)} / citation
                              </div>
                            </div>
                            <span className="outcomes-fraction">({formatNumber(controlRow.engagement_events)} total)</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="probe-section outcomes-section">
                        <h4>4. Purchase Intent</h4>
                        <p className="probe-explanation">When a product was recommended, how often did users click 'Buy on Amazon'?</p>
                        <div className="probe-rank-bars">
                          <div className="probe-rank-row">
                            <span className="probe-rank-label">GEO Optimized</span>
                            <div className="probe-rank-track">
                              <div className="probe-rank-fill probe-rank-geo" style={{ width: `${maxEng ? ((geoRow.purchases_per_citation || 0) / maxEng) * 100 : 0}%` }}>
                                {formatNumber(geoRow.purchases_per_citation || 0, 2)} / citation
                              </div>
                            </div>
                            <span className="outcomes-fraction">({formatNumber(geoRow.purchase_events || 0)} total)</span>
                          </div>
                          <div className="probe-rank-row">
                            <span className="probe-rank-label">Control</span>
                            <div className="probe-rank-track">
                              <div className="probe-rank-fill probe-rank-control" style={{ width: `${maxEng ? ((controlRow.purchases_per_citation || 0) / maxEng) * 100 : 0}%` }}>
                                {formatNumber(controlRow.purchases_per_citation || 0, 2)} / citation
                              </div>
                            </div>
                            <span className="outcomes-fraction">({formatNumber(controlRow.purchase_events || 0)} total)</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="table-wrap" style={{ marginTop: "1rem" }}>
                        <p className="eyebrow" style={{ marginBottom: "0.75rem" }}>Raw Data Export</p>
                        <table>
                          <thead><tr><th>Condition</th><th>Citations</th><th>Opportunity rate</th><th>Mean score</th><th>Reference engagement</th><th>Purchases</th></tr></thead>
                          <tbody>
                            {dashboard?.by_condition.length ? dashboard.by_condition.map((row) => (
                              <tr key={row.condition}>
                                <td><ConditionChip value={row.condition} /></td>
                                <td>{formatNumber(row.citation_events)} / {formatNumber(row.candidate_opportunities)}</td>
                                <td>{formatPercent(row.citation_rate)}</td>
                                <td>{formatNumber(row.mean_retrieval_score, 2)}</td>
                                <td>{formatNumber(row.engagement_events)} ({formatNumber(row.engagement_per_citation, 2)} / citation)</td>
                                <td>{formatNumber(row.purchase_events || 0)} ({formatNumber(row.purchases_per_citation || 0, 2)} / citation)</td>
                              </tr>
                            )) : <tr><td colSpan={6} className="empty-cell">{loading ? "Loading data…" : "No participant search data yet."}</td></tr>}
                          </tbody>
                        </table>
                      </div>
                      
                      <p className="footnote">{dashboard?.interpretation_note}</p>
                    </div>
                  );
                })() : <div className="empty-cell" style={{ padding: "2rem" }}>{loading ? "Loading data…" : "No participant search data yet."}</div>}
              </section>

              <section className="panel">
                <div className="panel-heading"><div><p className="eyebrow">Consumer outcomes</p><h2>Questionnaire construct means</h2></div></div>
                <div className="construct-list">
                  {dashboard && Object.entries(dashboard.survey_means).length > 0
                    ? Object.entries(dashboard.survey_means).map(([name, value]) => <div key={name}><span>{constructLabels[name] || titleCase(name)}</span><strong>{formatNumber(value, 2)} <small>/ 5</small></strong></div>)
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
                <p>Required CSV columns: <code>name</code>, <code>main_category</code>, <code>sub_category</code>, <code>image</code>, <code>link</code>, <code>ratings</code>, <code>no_of_ratings</code>, <code>discount_price</code>, and <code>actual_price</code>.</p>
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
              <div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Condition</th><th>Price</th><th>Rating</th><th>Citations / Opps</th></tr></thead><tbody>
                {products.length ? products.map((product) => (
                   <tr key={product.id}>
                     <td>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         {product.image_url && <img src={product.image_url} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />}
                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <strong style={{ fontSize: '0.85rem' }}>{product.title.length > 50 ? product.title.slice(0, 50) + "..." : product.title}</strong>
                           <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{product.sku || product.id}</span>
                         </div>
                       </div>
                     </td>
                     <td>{product.category}</td>
                     <td><ConditionChip value={product.condition} /></td>
                     <td>{product.price ? `${product.price} ${product.currency}` : "—"}</td>
                     <td>{product.rating ? `${product.rating} ★ (${product.review_count})` : "—"}</td>
                     <td>{formatNumber(product.citations)} / {formatNumber(product.opportunities)}</td>
                   </tr>
                )) : <tr><td colSpan={6} className="empty-cell">{loading ? "Loading product register…" : "No products found."}</td></tr>}
              </tbody></table></div>
              {totalProducts > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Showing {productPage * PRODUCTS_PER_PAGE + 1} to {Math.min((productPage + 1) * PRODUCTS_PER_PAGE, totalProducts)} of {formatNumber(totalProducts)} products</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button type="button" onClick={() => setProductPage(Math.max(0, productPage - 1))} disabled={productPage === 0} className="secondary-button" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', minWidth: 'auto' }}>Prev</button>
                    <button type="button" onClick={() => setProductPage(productPage + 1)} disabled={(productPage + 1) * PRODUCTS_PER_PAGE >= totalProducts} className="secondary-button" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', minWidth: 'auto' }}>Next</button>
                  </div>
                </div>
              )}
            </section>
          </>
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
            <button className="researcher-sidebar-refresh" type="button" onClick={() => { void refreshDashboard(); void fetchProducts(); }} disabled={loading}>
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
            <button className="secondary-button" type="button" onClick={() => { void refreshDashboard(); void fetchProducts(); }} disabled={loading}>
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
