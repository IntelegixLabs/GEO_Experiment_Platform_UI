import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import type {
  AnalyticsCategoryEffect,
  AnalyticsConditionMetric,
  AnalyticsFunnelStep,
  AnalyticsReport,
  AnalyticsSurveyConstruct,
  AnalyticsTimelinePoint,
} from "../types";
import { DemographicsPanel } from "./DemographicsPanel";
import { conditionLabel, formatNumber, titleCase } from "../utils/formatters";

interface RespondentAnalyticsPanelProps {
  onRefresh?: () => Promise<void> | void;
}

function formatRate(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const percentage = Math.abs(value) <= 1 ? value * 100 : value;
  return percentage.toFixed(1) + "%";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function downloadText(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? "\"" + text.replace(/"/g, "\"\"") + "\"" : text;
}

function csvText(rows: Array<Array<unknown>>): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function buildMetricCsv(report: AnalyticsReport): string {
  const rows: Array<Array<unknown>> = [["section", "metric", "value", "secondary_value"]];
  Object.entries(report.totals).forEach(([name, value]) => rows.push(["totals", titleCase(name), value, ""]));
  report.funnel.forEach((item) => rows.push(["funnel", item.stage, item.count, item.rate ?? ""]));
  (report.conditions || []).forEach((item) => {
    rows.push(["condition", conditionLabel(item.condition), item.citation_rate ?? "", item.candidate_opportunities]);
  });
  (report.survey?.constructs || []).forEach((item) => rows.push(["survey", titleCase(item.construct), item.mean ?? "", item.n]));
  (report.category_effects || []).forEach((item) => {
    rows.push(["category", item.category + " · " + conditionLabel(item.condition), item.citation_rate ?? "", item.candidate_opportunities]);
  });
  return csvText(rows);
}

function safeJsonReport(report: AnalyticsReport) {
  const { respondents: _respondents, ...aggregateReport } = report;
  return {
    ...aggregateReport,
    export_scope: "Aggregated researcher analytics only; respondent-level records deliberately excluded.",
  };
}

function normalizedRate(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.abs(value) <= 1 ? value * 100 : value));
}

function funnelRate(step: AnalyticsFunnelStep, firstCount: number): number {
  if (step.rate !== null && step.rate !== undefined) return normalizedRate(step.rate);
  return firstCount > 0 ? Math.max(0, Math.min(100, (step.count / firstCount) * 100)) : 0;
}

function ExperimentFlowVisual({ svgRef }: { svgRef: React.RefObject<SVGSVGElement> }) {
  return (
    <div className="analytics-experiment-visual">
      <div className="analytics-orbit analytics-orbit-one" aria-hidden="true" />
      <div className="analytics-orbit analytics-orbit-two" aria-hidden="true" />
      <svg ref={svgRef} viewBox="0 0 840 266" role="img" aria-label="Three-stage experimental flow: GEO product treatment, controlled shopping assistant, and respondent outcomes">
        <defs>
          <linearGradient id="analytics-cube-treatment" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#2d9d90" /><stop offset="1" stopColor="#176c72" /></linearGradient>
          <linearGradient id="analytics-cube-agent" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#f3bd57" /><stop offset="1" stopColor="#d88745" /></linearGradient>
          <linearGradient id="analytics-cube-outcome" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#7189b5" /><stop offset="1" stopColor="#4e5f91" /></linearGradient>
          <filter id="analytics-cube-shadow" x="-20%" y="-20%" width="150%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#193848" floodOpacity=".2" /></filter>
          <marker id="analytics-flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#7da9a7" /></marker>
        </defs>
        <path d="M230 133 C290 133 300 133 347 133" fill="none" stroke="#7da9a7" strokeWidth="3" strokeDasharray="8 8" markerEnd="url(#analytics-flow-arrow)" />
        <path d="M500 133 C560 133 570 133 617 133" fill="none" stroke="#7da9a7" strokeWidth="3" strokeDasharray="8 8" markerEnd="url(#analytics-flow-arrow)" />
        <g filter="url(#analytics-cube-shadow)">
          <polygon points="62,102 142,58 222,102 142,148" fill="#5bc0ae" />
          <polygon points="62,102 142,148 142,222 62,175" fill="#197477" />
          <polygon points="142,148 222,102 222,175 142,222" fill="url(#analytics-cube-treatment)" />
        </g>
        <text x="142" y="121" fill="#163c4c" fontSize="14" fontWeight="800" textAnchor="middle">Factual GEO</text>
        <text x="142" y="180" fill="#e7fbf8" fontSize="12" fontWeight="700" textAnchor="middle">Treatment</text>
        <text x="142" y="198" fill="#d2f0ed" fontSize="10" textAnchor="middle">Structure + evidence</text>
        <g filter="url(#analytics-cube-shadow)">
          <polygon points="352,102 432,58 512,102 432,148" fill="#ffd978" />
          <polygon points="352,102 432,148 432,222 352,175" fill="#d98a47" />
          <polygon points="432,148 512,102 512,175 432,222" fill="url(#analytics-cube-agent)" />
        </g>
        <text x="432" y="121" fill="#513d1f" fontSize="14" fontWeight="800" textAnchor="middle">Shopping AI</text>
        <text x="432" y="180" fill="#fff8df" fontSize="12" fontWeight="700" textAnchor="middle">Controlled agent</text>
        <text x="432" y="198" fill="#fff1d2" fontSize="10" textAnchor="middle">Retrieve → cite → explain</text>
        <g filter="url(#analytics-cube-shadow)">
          <polygon points="642,102 722,58 802,102 722,148" fill="#aab8dc" />
          <polygon points="642,102 722,148 722,222 642,175" fill="#51699a" />
          <polygon points="722,148 802,102 802,175 722,222" fill="url(#analytics-cube-outcome)" />
        </g>
        <text x="722" y="121" fill="#26324f" fontSize="14" fontWeight="800" textAnchor="middle">Respondents</text>
        <text x="722" y="180" fill="#edf1ff" fontSize="12" fontWeight="700" textAnchor="middle">Observed outcomes</text>
        <text x="722" y="198" fill="#dde6ff" fontSize="10" textAnchor="middle">Use · trust · intention</text>
        <text x="286" y="100" fill="#63908d" fontSize="10" fontWeight="800" textAnchor="middle">citation pathway</text>
        <text x="578" y="100" fill="#63908d" fontSize="10" fontWeight="800" textAnchor="middle">consumer pathway</text>
      </svg>
      <div className="analytics-visual-legend"><span><i className="treatment" />GEO page variant</span><span><i className="agent" />AI-assisted discovery</span><span><i className="outcome" />Pseudonymous outcomes</span></div>
    </div>
  );
}

function RadarChart({ constructs }: { constructs: AnalyticsSurveyConstruct[] }) {
  const chartId = useId();
  const values = constructs.slice(0, 6);
  const size = 250;
  const center = size / 2;
  const radius = 79;
  const scaleMaximum = Math.max(7, ...values.map((item) => item.maximum || item.mean || 0));
  const pointFor = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index / Math.max(1, values.length)) - Math.PI / 2;
    const distance = Math.max(0, Math.min(radius, (value / scaleMaximum) * radius));
    return { x: center + Math.cos(angle) * distance, y: center + Math.sin(angle) * distance };
  };
  const polygon = values.map((item, index) => {
    const point = pointFor(index, item.mean || 0);
    return point.x.toFixed(2) + "," + point.y.toFixed(2);
  }).join(" ");
  const axisPoints = values.map((_item, index) => {
    const point = pointFor(index, scaleMaximum);
    return { ...point, index };
  });
  const rings = [0.33, 0.66, 1].map((factor) => values.map((_item, index) => {
    const point = pointFor(index, scaleMaximum * factor);
    return point.x.toFixed(2) + "," + point.y.toFixed(2);
  }).join(" "));

  if (!values.length || !values.some((item) => item.mean !== null && item.mean !== undefined)) {
    return <div className="analytics-empty-chart">Survey construct means will appear after completed questionnaires are received.</div>;
  }

  return (
    <div className="analytics-radar-wrap">
      <svg viewBox={"0 0 " + size + " " + size} role="img" aria-labelledby={chartId}>
        <title id={chartId}>Survey construct mean radar chart</title>
        {rings.map((ring, index) => <polygon className="analytics-radar-ring" points={ring} key={index} />)}
        {axisPoints.map((point) => <line className="analytics-radar-axis" x1={center} y1={center} x2={point.x} y2={point.y} key={point.index} />)}
        <polygon className="analytics-radar-area" points={polygon} />
        {values.map((item, index) => {
          const point = pointFor(index, item.mean || 0);
          const labelPoint = pointFor(index, scaleMaximum * 1.2);
          return (
            <g key={item.construct}>
              <circle className="analytics-radar-dot" cx={point.x} cy={point.y} r="3.7" />
              <text className="analytics-radar-label" x={labelPoint.x} y={labelPoint.y} textAnchor={labelPoint.x < center - 6 ? "end" : labelPoint.x > center + 6 ? "start" : "middle"}>{titleCase(item.construct)}</text>
            </g>
          );
        })}
      </svg>
      <div className="analytics-radar-summary">{values.map((item) => <span key={item.construct}><i /><strong>{titleCase(item.construct)}</strong><b>{item.mean === null || item.mean === undefined ? "—" : item.mean.toFixed(2)}</b></span>)}</div>
    </div>
  );
}

function TimelineChart({ points }: { points: AnalyticsTimelinePoint[] }) {
  const chartId = useId();
  const values = points.map((point) => Number(point.queries || 0));
  const maximum = Math.max(1, ...values);
  const width = 560;
  const height = 186;
  const left = 22;
  const bottom = 28;
  const innerWidth = width - left - 14;
  const innerHeight = height - bottom - 16;
  const coordinates = values.map((value, index) => ({
    x: left + (innerWidth * index / Math.max(1, values.length - 1)),
    y: 16 + innerHeight - ((value / maximum) * innerHeight),
  }));
  const line = coordinates.map((point, index) => (index ? "L" : "M") + point.x.toFixed(2) + " " + point.y.toFixed(2)).join(" ");
  const area = line ? line + " L" + coordinates[coordinates.length - 1].x.toFixed(2) + " " + (height - bottom) + " L" + coordinates[0].x.toFixed(2) + " " + (height - bottom) + " Z" : "";

  if (!points.length) return <div className="analytics-empty-chart">A daily query timeline will appear after consented participants search the catalog.</div>;

  return (
    <div className="analytics-timeline-wrap">
      <svg viewBox={"0 0 " + width + " " + height} role="img" aria-labelledby={chartId}>
        <title id={chartId}>Participant query timeline</title>
        {[.25, .5, .75, 1].map((fraction) => <line className="analytics-timeline-gridline" x1={left} x2={width - 14} y1={16 + innerHeight - (fraction * innerHeight)} y2={16 + innerHeight - (fraction * innerHeight)} key={fraction} />)}
        <path className="analytics-timeline-area" d={area} />
        <path className="analytics-timeline-line" d={line} />
        {coordinates.map((point, index) => <circle className="analytics-timeline-point" cx={point.x} cy={point.y} r="4" key={points[index].date}><title>{points[index].date + ": " + formatNumber(values[index]) + " queries"}</title></circle>)}
        {points.map((point, index) => {
          if (points.length > 6 && index % Math.ceil(points.length / 6) !== 0 && index !== points.length - 1) return null;
          return <text className="analytics-timeline-label" x={coordinates[index].x} y={height - 9} textAnchor="middle" key={point.date + "-label"}>{point.date.slice(5)}</text>;
        })}
      </svg>
      <div className="analytics-timeline-key"><span><i />Queries</span><span>Peak: <strong>{formatNumber(maximum)}</strong> in one period</span></div>
    </div>
  );
}

export function RespondentAnalyticsPanel({ onRefresh }: RespondentAnalyticsPanelProps) {
  const headingId = useId();
  const flowSvgRef = useRef<SVGSVGElement>(null);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadStatus, setDownloadStatus] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextReport = await api.getAnalyticsReport(100);
      setReport(nextReport);
      await onRefresh?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Respondent analytics could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const conditions = report?.conditions || [];
  const constructs = report?.survey?.constructs || [];
  const categoryEffects = report?.category_effects || [];
  const respondents = report?.respondents?.items || [];
  const funnel = report?.funnel || [];
  const firstFunnelCount = funnel[0]?.count || 0;

  const overviewMetrics = useMemo(() => {
    if (!report) return [];
    const totals = report.totals;
    return [
      { label: "Consented respondents", value: totals.consented_sessions ?? report.respondents?.total ?? 0, detail: "eligible study records" },
      { label: "Shopping searches", value: totals.queries ?? 0, detail: "natural-language queries" },
      { label: "Completed surveys", value: totals.completed_surveys ?? 0, detail: "post-task responses" },
      { label: "Survey completion", value: formatRate(totals.survey_completion_rate), detail: "of consented respondents", isText: true },
    ];
  }, [report]);
  const visibleOverviewMetrics = loading && !report
    ? Array.from({ length: 4 }, (_value, index) => ({
      label: "loading-" + index,
      value: 0,
      detail: "",
      isText: false,
      loading: true,
    }))
    : overviewMetrics.map((metric) => ({ ...metric, loading: false }));

  const citationMaximum = Math.max(1, ...conditions.map((item) => normalizedRate(item.citation_rate)));
  const categoryRows = useMemo(() => {
    const grouped = new Map<string, AnalyticsCategoryEffect[]>();
    categoryEffects.forEach((item) => grouped.set(item.category, [...(grouped.get(item.category) || []), item]));
    return [...grouped.entries()].slice(0, 8);
  }, [categoryEffects]);

  function announceDownload(message: string) {
    setDownloadStatus(message);
    window.setTimeout(() => setDownloadStatus(""), 3500);
  }

  function exportCsv() {
    if (!report) return;
    downloadText("geo-respondent-analytics-metrics.csv", "text/csv;charset=utf-8", csvText([["Generated at", report.generated_at || ""], []]) + "\r\n" + buildMetricCsv(report));
    announceDownload("Aggregated metrics CSV downloaded. Respondent-level rows are excluded.");
  }

  function exportJson() {
    if (!report) return;
    downloadText("geo-respondent-analytics-aggregate.json", "application/json;charset=utf-8", JSON.stringify(safeJsonReport(report), null, 2));
    announceDownload("Aggregated analytics JSON downloaded. Pseudonymous respondent records are excluded.");
  }

  function exportSvg() {
    const svg = flowSvgRef.current;
    if (!svg) return;
    const source = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + svg.outerHTML.replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"");
    downloadText("geo-experiment-flow.svg", "image/svg+xml;charset=utf-8", source);
    announceDownload("Experiment-flow SVG downloaded.");
  }

  return (
    <section className="panel respondent-analytics-panel" aria-labelledby={headingId}>
      <header className="analytics-heading">
        <div>
          <p className="eyebrow">Researcher-only analytics</p>
          <h2 id={headingId}>Respondent outcomes and experiment signal</h2>
          <p>Aggregate the visibility pathway, participant interaction, and survey outcomes without exposing raw search text or direct identifiers.</p>
        </div>
        <div className="analytics-heading-actions">
          <span className={loading ? "analytics-live-badge loading" : "analytics-live-badge"}><i />{loading ? "Refreshing" : "Live report"}</span>
          <button className="secondary-button" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : "Refresh analytics"}</button>
        </div>
      </header>

      {report?.privacy && <div className="analytics-privacy-note"><span aria-hidden="true">◌</span><p><strong>Privacy boundary.</strong> This report includes consented sessions only and excludes raw queries, raw survey answers, participant codes, countries, and event metadata.</p></div>}
      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="analytics-export-row">
        <div><strong>Analysis exports</strong><small>Downloads contain aggregated metrics only; respondent-level records stay inside this protected console.</small></div>
        <div className="analytics-export-actions">
          <button className="secondary-button" type="button" onClick={exportCsv} disabled={!report}>Metrics CSV</button>
          <button className="secondary-button" type="button" onClick={exportJson} disabled={!report}>Aggregate JSON</button>
          <button className="secondary-button" type="button" onClick={exportSvg}>Experiment SVG</button>
        </div>
      </div>
      {downloadStatus && <p className="analytics-download-status" aria-live="polite">{downloadStatus}</p>}

      <div className="analytics-metric-grid" aria-live="polite">
        {visibleOverviewMetrics.map((metric) => (
          <article className={"analytics-metric-card" + (metric.loading ? " loading" : "")} key={metric.label}>
            <><span>{metric.loading ? "" : metric.label}</span><strong>{metric.loading ? "" : metric.isText ? metric.value : formatNumber(metric.value as number)}</strong><small>{metric.loading ? "" : metric.detail}</small></>
          </article>
        ))}
      </div>

      <div className="analytics-overview-grid">
        <section className="analytics-visual-panel" aria-labelledby="analytics-flow-heading">
          <div className="analytics-panel-heading"><div><p className="eyebrow">Causal path</p><h3 id="analytics-flow-heading">Experiment in motion</h3></div><span>Controlled, factual, observable</span></div>
          <ExperimentFlowVisual svgRef={flowSvgRef} />
        </section>
        <section className="analytics-funnel-panel" aria-labelledby="analytics-funnel-heading">
          <div className="analytics-panel-heading"><div><p className="eyebrow">Response journey</p><h3 id="analytics-funnel-heading">Participant funnel</h3></div></div>
          {funnel.length ? <ol className="analytics-funnel-list">{funnel.map((step, index) => {
            const rate = funnelRate(step, firstFunnelCount);
            return <li key={step.stage}><div><span className="analytics-funnel-step">{String(index + 1).padStart(2, "0")}</span><strong>{titleCase(step.stage)}</strong><small>{formatNumber(step.count)} respondents · {formatRate(step.rate ?? (firstFunnelCount ? step.count / firstFunnelCount : null))}</small></div><span className="analytics-funnel-track"><i style={{ width: rate + "%" }} /></span></li>;
          })}</ol> : <div className="analytics-empty-chart">The consent-to-survey pathway will populate as research sessions are recorded.</div>}
        </section>
      </div>

      <div className="analytics-chart-grid">
        <section className="analytics-chart-panel" aria-labelledby="analytics-condition-heading">
          <div className="analytics-panel-heading"><div><p className="eyebrow">Visibility effect</p><h3 id="analytics-condition-heading">Citation and engagement by condition</h3></div><span>Candidate-level denominator</span></div>
          {conditions.length ? <div className="analytics-condition-bars">{conditions.map((condition) => {
            const citationRate = normalizedRate(condition.citation_rate);
            const relativeWidth = citationMaximum ? (citationRate / citationMaximum) * 100 : 0;
            return <article key={condition.condition}>
              <div className="analytics-condition-topline"><span className={"condition-chip " + (condition.condition === "GEO_OPTIMIZED" ? "treatment" : "control")}>{conditionLabel(condition.condition)}</span><strong>{formatRate(condition.citation_rate)}</strong></div>
              <div className="analytics-condition-bar"><i className={condition.condition === "GEO_OPTIMIZED" ? "treatment" : "control"} style={{ width: relativeWidth + "%" }} /></div>
              <dl><div><dt>Citations</dt><dd>{formatNumber(condition.citation_events)} / {formatNumber(condition.candidate_opportunities)}</dd></div><div><dt>Top 3</dt><dd>{formatRate(condition.top3_rate)}</dd></div><div><dt>Engagement</dt><dd>{formatNumber(condition.engagement_events)}</dd></div></dl>
            </article>;
          })}</div> : <div className="analytics-empty-chart">Citation, top-three, and reference-engagement outcomes will appear after participant searches.</div>}
        </section>
        <section className="analytics-chart-panel" aria-labelledby="analytics-survey-heading">
          <div className="analytics-panel-heading"><div><p className="eyebrow">Consumer response</p><h3 id="analytics-survey-heading">Construct profile</h3></div><span>Mean on the study scale</span></div>
          <RadarChart constructs={constructs} />
        </section>
      </div>

      <div className="analytics-chart-grid analytics-lower-chart-grid">
        <section className="analytics-chart-panel" aria-labelledby="analytics-timeline-heading">
          <div className="analytics-panel-heading"><div><p className="eyebrow">Activity over time</p><h3 id="analytics-timeline-heading">Search activity timeline</h3></div><span>Consent-filtered</span></div>
          <TimelineChart points={report?.timeline || []} />
        </section>
        <section className="analytics-chart-panel" aria-labelledby="analytics-category-heading">
          <div className="analytics-panel-heading"><div><p className="eyebrow">Heterogeneity check</p><h3 id="analytics-category-heading">Category signal</h3></div><span>First 8 observed categories</span></div>
          {categoryRows.length ? <div className="analytics-category-list">{categoryRows.map(([category, rows]) => {
            const treatment = rows.find((item) => item.condition === "GEO_OPTIMIZED");
            const control = rows.find((item) => item.condition === "CONTROL");
            return <div key={category}><strong>{category}</strong><span><i className="control" style={{ width: normalizedRate(control?.citation_rate) + "%" }} /><b>{formatRate(control?.citation_rate)}</b></span><span><i className="treatment" style={{ width: normalizedRate(treatment?.citation_rate) + "%" }} /><b>{formatRate(treatment?.citation_rate)}</b></span></div>;
          })}</div> : <div className="analytics-empty-chart">Category-level outcomes appear when candidate opportunities have been logged.</div>}
        </section>
      </div>
      
      <DemographicsPanel />

      <section className="analytics-respondent-panel" aria-labelledby="analytics-respondent-heading">
        <div className="analytics-panel-heading"><div><p className="eyebrow">Pseudonymous response register</p><h3 id="analytics-respondent-heading">Respondent activity snapshot</h3></div><span>{formatNumber(report?.respondents?.total)} consented records</span></div>
        <p className="analytics-register-note">This view deliberately uses a generated respondent identifier. It excludes participant codes, search text, survey answers, country, and event metadata.</p>
        <div className="table-wrap"><table><thead><tr><th>Respondent ID</th><th>Cohort</th><th>Started</th><th>Queries</th><th>Interactions</th><th>Construct scores</th><th>Survey</th></tr></thead><tbody>
          {respondents.length ? respondents.slice(0, 10).map((respondent) => {
            const scoreEntries = Object.entries(respondent.survey_scores || {})
              .filter(([, score]) => score !== null && score !== undefined)
              .slice(0, 3);
            return (
              <tr key={respondent.respondent_id}>
                <td><code>{respondent.respondent_id}</code></td>
                <td>{respondent.study_cohort || "—"}</td>
                <td>{formatDate(respondent.started_at)}</td>
                <td>{formatNumber(respondent.query_count)}</td>
                <td>{formatNumber(respondent.event_count)}</td>
                <td>{scoreEntries.length ? <div className="analytics-score-badges">{scoreEntries.map(([construct, score]) => <span key={construct}>{titleCase(construct)} <b>{Number(score).toFixed(1)}</b></span>)}{Object.keys(respondent.survey_scores || {}).length > scoreEntries.length && <em>+ more</em>}</div> : "—"}</td>
                <td><span className={"analytics-survey-chip " + (respondent.survey_completed ? "complete" : "")}>{respondent.survey_completed ? "Complete" : "Pending"}</span></td>
              </tr>
            );
          }) : <tr><td colSpan={7} className="empty-cell">{loading ? "Loading protected response register…" : "No consented respondents have been recorded yet."}</td></tr>}
        </tbody></table></div>
        {report?.respondents?.has_more && <p className="footnote">Showing the first {formatNumber(respondents.length)} protected records from {formatNumber(report.respondents.total)}. Use approved database exports only when your protocol permits respondent-level analysis.</p>}
      </section>

      {report?.notes?.length ? <details className="analytics-method-notes"><summary>Report notes and safeguards</summary><ul>{report.notes.map((note) => <li key={note}>{note}</li>)}</ul></details> : null}
    </section>
  );
}
