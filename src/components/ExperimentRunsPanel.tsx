import { useState, useEffect } from "react";
import { api } from "../api/client";
import { Product } from "../types";

export function ExperimentRunsPanel() {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runProducts, setRunProducts] = useState<Product[]>([]);
  const [loadingRuns, setLoadingRuns] = useState<boolean>(true);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [filterCondition, setFilterCondition] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Pagination states
  const [runsPage, setRunsPage] = useState<number>(1);
  const [productsPage, setProductsPage] = useState<number>(1);

  const runsPerPage = 10;
  const productsPerPage = 10;

  const fetchRuns = async () => {
    setLoadingRuns(true);
    setError("");
    try {
      const data = await api.getGeoOptimizationRuns();
      setRuns(data || []);
      if (data && data.length > 0 && !selectedRunId) {
        setSelectedRunId(data[0].run_id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load experiment runs");
    } finally {
      setLoadingRuns(false);
    }
  };

  const fetchRunProducts = async (runId: string) => {
    setLoadingProducts(true);
    setError("");
    try {
      const products = await api.getGeoOptimizationRunProducts(runId);
      setRunProducts(products || []);
      setExpandedProductId(null);
      setProductsPage(1);
    } catch (err: any) {
      setError(err.message || "Failed to load products for this run");
      setRunProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    void fetchRuns();
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      void fetchRunProducts(selectedRunId);
    }
  }, [selectedRunId]);

  const selectedRun = runs.find((r) => r.run_id === selectedRunId);

  // Filter products by condition and search query
  const filteredProducts = runProducts.filter((p) => {
    if (filterCondition !== "ALL" && p.condition !== filterCondition) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (p.title || "").toLowerCase().includes(q);
      const catMatch = (p.category || "").toLowerCase().includes(q);
      const brandMatch = (p.brand || "").toLowerCase().includes(q);
      return titleMatch || catMatch || brandMatch;
    }
    return true;
  });

  // Reset product pagination when filter or search changes
  useEffect(() => {
    setProductsPage(1);
  }, [filterCondition, searchQuery]);

  // Runs pagination calculation
  const totalRunPages = Math.max(1, Math.ceil(runs.length / runsPerPage));
  const paginatedRuns = runs.slice((runsPage - 1) * runsPerPage, runsPage * runsPerPage);

  // Products pagination calculation
  const totalProductPages = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
  const paginatedProducts = filteredProducts.slice(
    (productsPage - 1) * productsPerPage,
    productsPage * productsPerPage
  );

  return (
    <section className="panel" aria-label="Experiment runs and modifications">
      <header className="panel-heading">
        <div>
          <p className="eyebrow">Experiment audit & logs</p>
          <h2>GEO Optimization Runs & Product Changes</h2>
          <p style={{ color: "#526c72", fontSize: "0.88rem", margin: 0, maxWidth: "760px" }}>
            Inspect past experimental waves, see which products ran, and review the exact factual modifications
            without touching the canonical e-commerce catalog.
          </p>
        </div>
        <div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void fetchRuns()}
            disabled={loadingRuns}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {loadingRuns ? "Refreshing..." : "Refresh Runs"}
          </button>
        </div>
      </header>

      {error && (
        <div className="callout error" role="alert" style={{ margin: "16px 0" }}>
          <p>{error}</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px", marginTop: "20px", alignItems: "start" }}>
        {/* Left column: List of runs with pagination */}
        <div style={{ borderRight: "1px solid #e1e9e9", paddingRight: "16px", display: "flex", flexDirection: "column", gap: "16px", alignSelf: "start", height: "fit-content" }}>
          <div>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "12px", color: "#5e757a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Experimental Waves ({runs.length})
            </h3>
            {loadingRuns ? (
              <p style={{ fontSize: "0.85rem", color: "#5e757a" }}>Loading runs...</p>
            ) : runs.length === 0 ? (
              <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e1e9e9", textAlign: "center" }}>
                <p style={{ fontSize: "0.85rem", color: "#5e757a", margin: 0 }}>No experiment runs recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {paginatedRuns.map((run) => {
                  const isSelected = run.run_id === selectedRunId;
                  return (
                    <button
                      key={run.run_id}
                      type="button"
                      onClick={() => setSelectedRunId(run.run_id)}
                      style={{
                        textAlign: "left",
                        padding: "12px",
                        borderRadius: "8px",
                        border: isSelected ? "1px solid #126166" : "1px solid #e1e9e9",
                        borderLeft: isSelected ? "4px solid #126166" : "1px solid #e1e9e9",
                        background: isSelected ? "#f0faf8" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected ? "0 2px 8px rgba(18, 97, 102, 0.08)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <strong style={{ fontSize: "0.85rem", color: "#163b43" }}>
                          {run.run_id.slice(0, 14)}...
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "#5e757a" }}>
                          {run.created_at ? new Date(run.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#5e757a", marginBottom: "6px" }}>
                        {run.created_at ? new Date(run.created_at).toLocaleDateString() : "Unknown date"}
                      </div>
                      <div style={{ display: "flex", gap: "8px", fontSize: "0.75rem" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "20px", background: "#def3ed", color: "#126166", fontWeight: 700 }}>
                          GEO: {run.geo_optimized_products || 0}
                        </span>
                        <span style={{ padding: "2px 8px", borderRadius: "20px", background: "#f4f7f7", color: "#5e757a", fontWeight: 700, border: "1px solid #e1e9e9" }}>
                          Ctrl: {run.control_products || 0}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Runs pagination controls */}
          {runs.length > runsPerPage && (
            <div style={{ borderTop: "1px solid #e1e9e9", paddingTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setRunsPage((p) => Math.max(1, p - 1))}
                disabled={runsPage === 1}
                style={{ padding: "4px 10px", fontSize: "0.75rem", fontWeight: 600 }}
              >
                Prev
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "#5e757a" }}>
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalRunPages}
                  value={runsPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setRunsPage(Math.max(1, Math.min(totalRunPages, val)));
                    }
                  }}
                  aria-label="Go to run page number"
                  style={{
                    width: "48px",
                    padding: "2px 6px",
                    textAlign: "center",
                    border: "1px solid #126166",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#163b43",
                    background: "#ffffff",
                    outline: "none",
                  }}
                />
                <span>of <strong>{totalRunPages}</strong></span>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setRunsPage((p) => Math.min(totalRunPages, p + 1))}
                disabled={runsPage === totalRunPages}
                style={{ padding: "4px 10px", fontSize: "0.75rem", fontWeight: 600 }}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right column: Selected Run Details & Product Changes */}
        <div style={{ alignSelf: "start" }}>
          {selectedRun ? (
            <div>
              <div
                style={{
                  padding: "16px",
                  borderRadius: "10px",
                  background: "#f8fafc",
                  border: "1px solid #d7e3e4",
                  marginBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#163b43" }}>
                    Run ID: {selectedRun.run_id}
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#5e757a" }}>
                    Config: {selectedRun.config_id} · Recorded:{" "}
                    {selectedRun.created_at ? new Date(selectedRun.created_at).toLocaleString() : "Unknown"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ textAlign: "center", background: "#ffffff", padding: "6px 14px", borderRadius: "8px", border: "1px solid #afd2cf" }}>
                    <div style={{ fontSize: "0.7rem", color: "#5e757a", fontWeight: 700 }}>TOTAL SCOPED</div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#163b43" }}>{selectedRun.selected_products || runProducts.length}</div>
                  </div>
                  <div style={{ textAlign: "center", background: "#ffffff", padding: "6px 14px", borderRadius: "8px", border: "1px solid #afd2cf" }}>
                    <div style={{ fontSize: "0.7rem", color: "#126166", fontWeight: 700 }}>GEO TREATED</div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#126166" }}>{selectedRun.geo_optimized_products || 0}</div>
                  </div>
                  <div style={{ textAlign: "center", background: "#ffffff", padding: "6px 14px", borderRadius: "8px", border: "1px solid #c6dada" }}>
                    <div style={{ fontSize: "0.7rem", color: "#5e757a", fontWeight: 700 }}>CONTROL</div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#5e757a" }}>{selectedRun.control_products || 0}</div>
                  </div>
                </div>
              </div>

              {/* Filter controls */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
                <div className="prompt-chips" style={{ margin: 0 }}>
                  {(["ALL", "GEO_OPTIMIZED", "CONTROL"] as const).map((cond) => {
                    const isActive = filterCondition === cond;
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setFilterCondition(cond)}
                        style={{
                          background: isActive ? "#126166" : "#ffffff",
                          color: isActive ? "#ffffff" : "#3c6268",
                          borderColor: isActive ? "#126166" : "#c6dada",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {cond === "ALL" ? "All Products" : cond === "GEO_OPTIMIZED" ? "GEO Treated Only" : "Control Only"}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="search"
                  placeholder="Search title, category, brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #c6dada",
                    fontSize: "0.85rem",
                    color: "#163b43",
                    width: "250px",
                  }}
                />
              </div>

              {/* Products list with pagination */}
              {loadingProducts ? (
                <p style={{ padding: "20px", textAlign: "center", color: "#5e757a" }}>Loading products for run...</p>
              ) : filteredProducts.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px solid #d7e3e4" }}>
                  <p style={{ color: "#5e757a", margin: 0 }}>No products match the current filter.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {paginatedProducts.map((p) => {
                      const isExpanded = expandedProductId === p.id;
                      const isGeo = p.condition === "GEO_OPTIMIZED";
                      const bundle = p.geo_bundle || {};

                      return (
                        <div
                          key={p.id}
                          style={{
                            border: "1px solid #afd2cf",
                            borderRadius: "10px",
                            background: "#ffffff",
                            overflow: "hidden",
                            boxShadow: "0 2px 6px rgba(15, 61, 68, 0.04)",
                            transition: "border-color 0.15s ease",
                          }}
                        >
                          <div
                            onClick={() => setExpandedProductId(isExpanded ? null : p.id)}
                            style={{
                              padding: "14px 16px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              cursor: "pointer",
                              background: "#ffffff",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                              <span
                                className="pill"
                                style={{
                                  background: isGeo ? "#def3ed" : "#f4f7f7",
                                  color: isGeo ? "#126166" : "#5e757a",
                                  border: isGeo ? "1px solid #afd2cf" : "1px solid #c6dada",
                                }}
                              >
                                {isGeo ? "GEO OPTIMIZED" : "CONTROL"}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#163b43", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {p.title}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#5e757a" }}>
                                  ID: {p.id} · Category: {p.category} · Price: ${p.price || 0}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              style={{
                                background: "none",
                                border: "none",
                                color: "#126166",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                            >
                              {isExpanded ? "Hide Diff" : "View Changes"}
                            </button>
                          </div>

                          {isExpanded && (
                            <div style={{ borderTop: "1px solid #d7e3e4", padding: "16px", background: "#f8fafc" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                                {/* Left: Canonical Catalog Data */}
                                <div style={{ background: "#ffffff", padding: "14px", borderRadius: "8px", border: "1px solid #afd2cf" }}>
                                  <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#5e757a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    Original Catalog Record
                                  </h4>
                                  <div style={{ fontSize: "0.85rem", color: "#163b43", marginBottom: "8px" }}>
                                    <strong>Title:</strong> {p.title}
                                  </div>
                                  {p.brand && (
                                    <div style={{ fontSize: "0.85rem", color: "#163b43", marginBottom: "8px" }}>
                                      <strong>Brand:</strong> {p.brand}
                                    </div>
                                  )}
                                  <div style={{ fontSize: "0.85rem", color: "#163b43", marginBottom: "8px" }}>
                                    <strong>Description:</strong> {p.description || "N/A"}
                                  </div>
                                  {p.key_features && p.key_features.length > 0 && (
                                    <div>
                                      <strong style={{ fontSize: "0.85rem", color: "#163b43" }}>Original Features:</strong>
                                      <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "0.8rem", color: "#5e757a" }}>
                                        {p.key_features.map((feat, i) => (
                                          <li key={i}>{feat}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                {/* Right: GEO Optimization Bundle */}
                                <div
                                  style={{
                                    background: isGeo ? "#f0faf8" : "#ffffff",
                                    padding: "14px",
                                    borderRadius: "8px",
                                    border: isGeo ? "1px solid #afd2cf" : "1px solid #c6dada",
                                  }}
                                >
                                  <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: isGeo ? "#126166" : "#5e757a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    {isGeo ? "GEO Treatment Modifications" : "Control Condition (No Treatment)"}
                                  </h4>
                                  {isGeo ? (
                                    <div>
                                      {bundle.summary && (
                                        <div style={{ marginBottom: "10px", fontSize: "0.85rem", color: "#126166" }}>
                                          <strong>Factual Summary:</strong>
                                          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#163b43", lineHeight: 1.4 }}>{bundle.summary}</p>
                                        </div>
                                      )}
                                      {bundle.specifications && Object.keys(bundle.specifications).length > 0 && (
                                        <div style={{ marginBottom: "10px" }}>
                                          <strong style={{ fontSize: "0.85rem", color: "#126166" }}>Structured Specifications:</strong>
                                          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", marginTop: "6px", fontSize: "0.8rem" }}>
                                            {Object.entries(bundle.specifications).map(([k, v]) => (
                                              <div key={k} style={{ display: "contents" }}>
                                                <span style={{ fontWeight: 700, color: "#126166" }}>{k}:</span>
                                                <span style={{ color: "#163b43" }}>{String(v)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {bundle.claim_blocks && bundle.claim_blocks.length > 0 && (
                                        <div>
                                          <strong style={{ fontSize: "0.85rem", color: "#126166" }}>Claim-Evidence Links:</strong>
                                          <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "0.8rem", color: "#126166" }}>
                                            {bundle.claim_blocks.map((block: any, i: number) => (
                                              <li key={i}>
                                                <strong>{block.claim}</strong> — <span style={{ color: "#5e757a" }}>{block.evidence}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      <div style={{ marginTop: "12px", fontSize: "0.75rem", color: "#126166" }}>
                                        <em>Stored in geo_optimized_products (run: {bundle.run_id || selectedRun.run_id})</em>
                                      </div>
                                    </div>
                                  ) : (
                                    <p style={{ fontSize: "0.85rem", color: "#5e757a", margin: 0 }}>
                                      This product was assigned to the control condition. Its canonical catalog record was presented to participants and vector retrieval without GEO modification.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Products pagination controls */}
                  {filteredProducts.length > productsPerPage && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "16px",
                        paddingTop: "16px",
                        borderTop: "1px solid #d7e3e4",
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", color: "#5e757a" }}>
                        Showing <strong>{(productsPage - 1) * productsPerPage + 1}</strong>–
                        <strong>{Math.min(productsPage * productsPerPage, filteredProducts.length)}</strong> of{" "}
                        <strong>{filteredProducts.length}</strong> products
                      </div>

                      <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f4f7f7", padding: "4px 12px", borderRadius: "8px", border: "1px solid #c6dada" }}>
                          <span style={{ fontSize: "0.85rem", color: "#5e757a", fontWeight: 600 }}>Go to page:</span>
                          <input
                            type="number"
                            min={1}
                            max={totalProductPages}
                            value={productsPage}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                setProductsPage(Math.max(1, Math.min(totalProductPages, val)));
                              }
                            }}
                            aria-label="Go to product page number"
                            style={{
                              width: "60px",
                              padding: "4px 8px",
                              textAlign: "center",
                              border: "1px solid #126166",
                              borderRadius: "6px",
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              color: "#163b43",
                              background: "#ffffff",
                              outline: "none",
                            }}
                          />
                          <span style={{ fontSize: "0.85rem", color: "#5e757a" }}>of <strong>{totalProductPages}</strong></span>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setProductsPage((p) => Math.max(1, p - 1))}
                            disabled={productsPage === 1}
                            style={{ padding: "6px 14px", fontSize: "0.8rem", fontWeight: 600 }}
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setProductsPage((p) => Math.min(totalProductPages, p + 1))}
                            disabled={productsPage === totalProductPages}
                            style={{ padding: "6px 14px", fontSize: "0.8rem", fontWeight: 600 }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px solid #d7e3e4" }}>
              <p style={{ color: "#5e757a" }}>Select an experiment run from the list on the left to view products and modifications.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
