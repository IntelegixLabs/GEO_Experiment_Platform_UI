import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "../api/client";
import { Modal } from "./Modal";

interface RespondentItem {
  session_id: string;
  participant_code: string;
  email?: string;
  age?: number;
  country?: string;
  ai_familiarity?: string;
  study_cohort?: string;
  consent: boolean;
  started_at?: string;
  completed_at?: string;
  queries_count: number;
  interactions_count: number;
  survey_status: string;
}

interface ActivityQuery {
  id: string;
  query_text: string;
  category_filter?: string;
  created_at?: string;
}

interface ActivityInteraction {
  id: string;
  event_type: string;
  product_id?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

interface ActivitySurvey {
  id: string;
  answers: Record<string, any>;
  scale_scores: Record<string, any>;
  completed_at?: string;
}

interface ActivityDetail {
  session: {
    session_id: string;
    participant_code: string;
    email?: string;
    age?: number;
    country?: string;
    ai_familiarity?: string;
    study_cohort?: string;
    consent: boolean;
    started_at?: string;
    completed_at?: string;
  };
  queries: ActivityQuery[];
  interactions: ActivityInteraction[];
  surveys: ActivitySurvey[];
}

export function RespondentActivityPanel() {
  const [respondents, setRespondents] = useState<RespondentItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cohortFilter, setCohortFilter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Activity modal state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<ActivityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"queries" | "interactions" | "surveys">("queries");

  const loadRespondents = useCallback(
    async (currentPage = page, currentSize = pageSize, query = searchQuery, cohort = cohortFilter) => {
      setLoading(true);
      setError("");
      try {
        const res = await api.getRespondents({
          page: currentPage,
          limit: currentSize,
          query: query.trim() || undefined,
          cohort: cohort || undefined,
        });
        setRespondents(res.items || []);
        setTotal(res.total || 0);
        setPage(res.page || currentPage);
        setTotalPages(res.pages || 1);
      } catch (err: any) {
        setError(err?.message || "Failed to load respondents list.");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, searchQuery, cohortFilter]
  );

  useEffect(() => {
    loadRespondents(1, pageSize, searchQuery, cohortFilter);
  }, [pageSize, cohortFilter]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    loadRespondents(1, pageSize, searchQuery, cohortFilter);
  }

  async function openActivityModal(sessionId: string) {
    setSelectedSessionId(sessionId);
    setDetailData(null);
    setDetailLoading(true);
    setDetailError("");
    setActiveTab("queries");
    try {
      const data = await api.getRespondentActivity(sessionId);
      setDetailData(data);
    } catch (err: any) {
      setDetailError(err?.message || "Failed to load respondent activity logs.");
    } finally {
      setDetailLoading(false);
    }
  }

  function formatTimestamp(iso?: string) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <section className="research-panel">
      <div
        className="panel-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid #c6dada",
          paddingBottom: "16px",
          marginBottom: "20px",
        }}
      >
        <div>
          <p className="eyebrow" style={{ color: "#547980", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
            RESEARCHER CONSOLE • RESPONDENT LOGS
          </p>
          <h2 style={{ color: "#163b43", fontSize: "1.5rem", fontWeight: 700, margin: "4px 0 0 0" }}>
            Respondent activity & profiles
          </h2>
          <p style={{ color: "#547980", fontSize: "0.9rem", margin: "4px 0 0 0" }}>
            Detailed view of all study participants, email addresses, demographics, queries, interactions, and survey responses.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #c6dada",
              borderRadius: "8px",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "#547980", fontWeight: 600 }}>Total Consented:</span>
            <span style={{ fontSize: "1.1rem", color: "#163b43", fontWeight: 700 }}>{total}</span>
          </div>
          <button
            onClick={() => loadRespondents(page, pageSize, searchQuery, cohortFilter)}
            style={{
              background: "#ffffff",
              border: "1px solid #c6dada",
              color: "#163b43",
              padding: "8px 14px",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "20px",
          background: "#ffffff",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid #c6dada",
        }}
      >
        <div style={{ flex: "1 1 240px", display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="Search by participant name, session ID, email, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #c6dada",
              fontSize: "0.9rem",
              color: "#163b43",
            }}
          />
          <button
            type="submit"
            style={{
              background: "#126166",
              color: "#ffffff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Filter
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "0.85rem", color: "#547980", fontWeight: 600 }}>Cohort:</label>
          <select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #c6dada",
              fontSize: "0.85rem",
              color: "#163b43",
              background: "#ffffff",
            }}
          >
            <option value="">All Cohorts</option>
            <option value="main">main</option>
            <option value="auto-recovered">auto-recovered</option>
            <option value="pilot">pilot</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          <label style={{ fontSize: "0.85rem", color: "#547980", fontWeight: 600 }}>Show:</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #c6dada",
              fontSize: "0.85rem",
              color: "#163b43",
              background: "#ffffff",
            }}
          >
            <option value={10}>10 per page</option>
            <option value={15}>15 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </form>

      {/* Error display */}
      {error && (
        <div
          style={{
            background: "#fdf2f2",
            border: "1px solid #f87171",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading view */}
      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "#547980", fontWeight: 600 }}>
          Loading respondent activity records...
        </div>
      ) : respondents.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px dashed #c6dada",
            borderRadius: "8px",
            padding: "48px 24px",
            textAlign: "center",
            color: "#547980",
          }}
        >
          <p style={{ fontWeight: 600, fontSize: "1rem", margin: "0 0 8px 0" }}>No matching respondents found</p>
          <p style={{ fontSize: "0.85rem", margin: 0 }}>
            Try broadening your filter criteria or checking another cohort.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #c6dada",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "0.88rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f4f7f7",
                    borderBottom: "2px solid #c6dada",
                    color: "#163b43",
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: "12px 16px" }}>Participant / ID</th>
                  <th style={{ padding: "12px 16px" }}>Email & Age</th>
                  <th style={{ padding: "12px 16px" }}>Location</th>
                  <th style={{ padding: "12px 16px" }}>AI Familiarity</th>
                  <th style={{ padding: "12px 16px" }}>Cohort</th>
                  <th style={{ padding: "12px 16px" }}>Started At</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Activity</th>
                  <th style={{ padding: "12px 16px" }}>Survey</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {respondents.map((resp, idx) => (
                  <tr
                    key={resp.session_id}
                    style={{
                      borderBottom: idx === respondents.length - 1 ? "none" : "1px solid #e2ecec",
                      background: idx % 2 === 0 ? "#ffffff" : "#fafcfc",
                    }}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "#163b43" }}>{resp.participant_code || "Anonymous"}</div>
                      <div style={{ fontSize: "0.75rem", color: "#547980", fontFamily: "monospace", marginTop: "2px" }}>
                        {resp.session_id}
                      </div>
                    </td>

                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ color: "#163b43", fontWeight: 500 }}>{resp.email || "—"}</div>
                      {resp.age && (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.75rem",
                            background: "#e2ecec",
                            color: "#163b43",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            marginTop: "4px",
                            fontWeight: 600,
                          }}
                        >
                          Age: {resp.age}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "14px 16px", color: "#163b43" }}>{resp.country || "—"}</td>

                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          background: "#f0f5f5",
                          color: "#163b43",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontWeight: 500,
                        }}
                      >
                        {resp.ai_familiarity || "—"}
                      </span>
                    </td>

                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          background: "#eef2ff",
                          color: "#3730a3",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          fontWeight: 600,
                        }}
                      >
                        {resp.study_cohort || "main"}
                      </span>
                    </td>

                    <td style={{ padding: "14px 16px", color: "#547980", whiteSpace: "nowrap" }}>
                      {formatTimestamp(resp.started_at)}
                    </td>

                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <span
                          title="Search queries"
                          style={{
                            background: "#e0f2fe",
                            color: "#0369a1",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {resp.queries_count} Qs
                        </span>
                        <span
                          title="Product interactions & citations"
                          style={{
                            background: "#f3e8ff",
                            color: "#6b21a8",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {resp.interactions_count} Ints
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          padding: "3px 8px",
                          borderRadius: "12px",
                          fontWeight: 700,
                          background: resp.survey_status === "Completed" ? "#dcfce7" : "#fef3c7",
                          color: resp.survey_status === "Completed" ? "#15803d" : "#b45309",
                        }}
                      >
                        {resp.survey_status}
                      </span>
                    </td>

                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => openActivityModal(resp.session_id)}
                        style={{
                          background: "#126166",
                          color: "#ffffff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                      >
                        View Activity
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div
            style={{
              padding: "12px 18px",
              background: "#f4f7f7",
              borderTop: "1px solid #c6dada",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "0.85rem", color: "#547980" }}>
              Showing page <strong style={{ color: "#163b43" }}>{page}</strong> of{" "}
              <strong style={{ color: "#163b43" }}>{totalPages}</strong> ({total} total respondents)
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                style={{
                  background: page <= 1 ? "#e2ecec" : "#ffffff",
                  color: page <= 1 ? "#94a3b8" : "#163b43",
                  border: "1px solid #c6dada",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                style={{
                  background: page >= totalPages ? "#e2ecec" : "#ffffff",
                  color: page >= totalPages ? "#94a3b8" : "#163b43",
                  border: "1px solid #c6dada",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Details Modal */}
      <Modal
        open={!!selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
        titleId="respondent-activity-title"
      >
        <button
          className="close-button"
          type="button"
          onClick={() => setSelectedSessionId(null)}
          aria-label="Close activity modal"
        >
          ×
        </button>
        <p className="eyebrow" style={{ color: "#547980", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase" }}>
          RESPONDENT ACTIVITY PROFILE
        </p>
        <h2 id="respondent-activity-title" style={{ color: "#163b43", margin: "4px 0 16px 0", fontSize: "1.4rem" }}>
          {detailData?.session?.participant_code || "Participant Details"}
        </h2>

        {detailLoading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#547980", fontWeight: 600 }}>
            Loading respondent activity logs...
          </div>
        ) : detailError ? (
          <div style={{ color: "#991b1b", background: "#fdf2f2", padding: "12px", borderRadius: "6px" }}>
            {detailError}
          </div>
        ) : detailData ? (
          <div>
            {/* Profile snapshot card */}
            <div
              style={{
                background: "#f4f7f7",
                border: "1px solid #c6dada",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "20px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                fontSize: "0.85rem",
              }}
            >
              <div>
                <span style={{ color: "#547980", display: "block", fontSize: "0.75rem" }}>Session ID</span>
                <strong style={{ color: "#163b43", fontFamily: "monospace" }}>{detailData.session.session_id}</strong>
              </div>
              <div>
                <span style={{ color: "#547980", display: "block", fontSize: "0.75rem" }}>Email Address</span>
                <strong style={{ color: "#163b43" }}>{detailData.session.email || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#547980", display: "block", fontSize: "0.75rem" }}>Age</span>
                <strong style={{ color: "#163b43" }}>{detailData.session.age || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#547980", display: "block", fontSize: "0.75rem" }}>Location</span>
                <strong style={{ color: "#163b43" }}>{detailData.session.country || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#547980", display: "block", fontSize: "0.75rem" }}>AI Familiarity</span>
                <strong style={{ color: "#163b43" }}>{detailData.session.ai_familiarity || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#547980", display: "block", fontSize: "0.75rem" }}>Cohort</span>
                <strong style={{ color: "#163b43" }}>{detailData.session.study_cohort || "main"}</strong>
              </div>
              <div>
                <span style={{ color: "#547980", display: "block", fontSize: "0.75rem" }}>Started At</span>
                <strong style={{ color: "#163b43" }}>{formatTimestamp(detailData.session.started_at)}</strong>
              </div>
              <div>
                <span style={{ color: "#547980", display: "block", fontSize: "0.75rem" }}>Completed At</span>
                <strong style={{ color: "#163b43" }}>{formatTimestamp(detailData.session.completed_at)}</strong>
              </div>
            </div>

            {/* Tabs selector */}
            <div
              style={{
                display: "flex",
                borderBottom: "2px solid #c6dada",
                gap: "24px",
                marginBottom: "16px",
              }}
            >
              <button
                onClick={() => setActiveTab("queries")}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === "queries" ? "3px solid #126166" : "3px solid transparent",
                  padding: "8px 4px",
                  fontWeight: 700,
                  color: activeTab === "queries" ? "#126166" : "#547980",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Search Queries ({detailData.queries.length})
              </button>
              <button
                onClick={() => setActiveTab("interactions")}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === "interactions" ? "3px solid #126166" : "3px solid transparent",
                  padding: "8px 4px",
                  fontWeight: 700,
                  color: activeTab === "interactions" ? "#126166" : "#547980",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Product Interactions ({detailData.interactions.length})
              </button>
              <button
                onClick={() => setActiveTab("surveys")}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === "surveys" ? "3px solid #126166" : "3px solid transparent",
                  padding: "8px 4px",
                  fontWeight: 700,
                  color: activeTab === "surveys" ? "#126166" : "#547980",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Survey Responses ({detailData.surveys.length})
              </button>
            </div>

            {/* Tab content */}
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {activeTab === "queries" && (
                <div>
                  {detailData.queries.length === 0 ? (
                    <p style={{ color: "#547980", fontStyle: "italic" }}>No search queries recorded for this respondent.</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ background: "#f4f7f7", borderBottom: "1px solid #c6dada" }}>
                          <th style={{ padding: "8px 10px", textAlign: "left" }}>Time</th>
                          <th style={{ padding: "8px 10px", textAlign: "left" }}>Search Query Text</th>
                          <th style={{ padding: "8px 10px", textAlign: "left" }}>Category Filter</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.queries.map((q) => (
                          <tr key={q.id} style={{ borderBottom: "1px solid #e2ecec" }}>
                            <td style={{ padding: "8px 10px", color: "#547980", whiteSpace: "nowrap" }}>
                              {formatTimestamp(q.created_at)}
                            </td>
                            <td style={{ padding: "8px 10px", fontWeight: 600, color: "#163b43" }}>{q.query_text}</td>
                            <td style={{ padding: "8px 10px", color: "#547980" }}>{q.category_filter || "All Categories"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === "interactions" && (
                <div>
                  {detailData.interactions.length === 0 ? (
                    <p style={{ color: "#547980", fontStyle: "italic" }}>No product interactions recorded.</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ background: "#f4f7f7", borderBottom: "1px solid #c6dada" }}>
                          <th style={{ padding: "8px 10px", textAlign: "left" }}>Time</th>
                          <th style={{ padding: "8px 10px", textAlign: "left" }}>Event Type</th>
                          <th style={{ padding: "8px 10px", textAlign: "left" }}>Product ID</th>
                          <th style={{ padding: "8px 10px", textAlign: "left" }}>Metadata</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.interactions.map((intx) => (
                          <tr key={intx.id} style={{ borderBottom: "1px solid #e2ecec" }}>
                            <td style={{ padding: "8px 10px", color: "#547980", whiteSpace: "nowrap" }}>
                              {formatTimestamp(intx.created_at)}
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              <span
                                style={{
                                  background: "#f0fdf4",
                                  color: "#166534",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 600,
                                }}
                              >
                                {intx.event_type}
                              </span>
                            </td>
                            <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#163b43" }}>
                              {intx.product_id || "—"}
                            </td>
                            <td style={{ padding: "8px 10px", color: "#547980", fontSize: "0.78rem" }}>
                              {intx.metadata && Object.keys(intx.metadata).length > 0
                                ? JSON.stringify(intx.metadata)
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === "surveys" && (
                <div>
                  {detailData.surveys.length === 0 ? (
                    <p style={{ color: "#547980", fontStyle: "italic" }}>No survey completed by this respondent.</p>
                  ) : (
                    detailData.surveys.map((sv) => (
                      <div
                        key={sv.id}
                        style={{
                          background: "#f9fbfb",
                          border: "1px solid #c6dada",
                          borderRadius: "6px",
                          padding: "16px",
                          marginBottom: "12px",
                        }}
                      >
                        <div style={{ fontWeight: 700, color: "#163b43", marginBottom: "8px" }}>
                          Completed on: {formatTimestamp(sv.completed_at)}
                        </div>
                        <h4 style={{ margin: "12px 0 6px 0", color: "#163b43", fontSize: "0.9rem" }}>Answers:</h4>
                        <pre
                          style={{
                            background: "#ffffff",
                            padding: "10px",
                            borderRadius: "4px",
                            border: "1px solid #e2ecec",
                            fontSize: "0.8rem",
                            overflowX: "auto",
                          }}
                        >
                          {JSON.stringify(sv.answers, null, 2)}
                        </pre>
                        {sv.scale_scores && (
                          <>
                            <h4 style={{ margin: "12px 0 6px 0", color: "#163b43", fontSize: "0.9rem" }}>Scale Scores:</h4>
                            <pre
                              style={{
                                background: "#ffffff",
                                padding: "10px",
                                borderRadius: "4px",
                                border: "1px solid #e2ecec",
                                fontSize: "0.8rem",
                              }}
                            >
                              {JSON.stringify(sv.scale_scores, null, 2)}
                            </pre>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
