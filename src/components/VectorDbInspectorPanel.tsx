import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { api } from "../api/client";
import { formatNumber } from "../utils/formatters";

interface VectorDbStatus {
  status: string;
  count: number;
  collection_name: string;
  embedding_function: string;
  path: string;
}

interface IndexedProduct {
  id: string;
  title: string;
  category: string;
  price?: string | number;
  condition?: string;
  score?: number;
  retrieval_score?: number;
  rank_position?: number;
  geo_bundle?: any;
  run_id?: string;
  [key: string]: any;
}

interface VectorDbInspectorPanelProps {
  categories: string[];
}

export function VectorDbInspectorPanel({ categories }: VectorDbInspectorPanelProps) {
  const [statusData, setStatusData] = useState<VectorDbStatus | null>(null);
  const [products, setProducts] = useState<IndexedProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clearing, setClearing] = useState<boolean>(false);

  const loadData = useCallback(async (targetPage: number, targetPageSize: number, query: string, cat: string) => {
    setLoading(true);
    setError("");
    try {
      const [statusRes, productsRes] = await Promise.all([
        api.getVectorDbStatus(),
        api.getVectorDbProducts({ page: targetPage, limit: targetPageSize, query, category_filter: cat }),
      ]);
      setStatusData(statusRes);
      setProducts(productsRes.items || []);
      setTotalProducts(productsRes.total || 0);
      setPage(productsRes.page || 1);
      setTotalPages(productsRes.pages || 1);
    } catch (err: any) {
      setError(err.message || "Failed to inspect Vector DB.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(1, pageSize, "", "");
  }, [loadData, pageSize]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData(1, pageSize, searchQuery, selectedCategory);
  };

  const handleReset = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setPage(1);
    loadData(1, pageSize, "", "");
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      loadData(newPage, pageSize, searchQuery, selectedCategory);
    }
  };

  const handleClearDb = async () => {
    if (!window.confirm("Are you sure you want to clear the entire vector database? All semantic search capabilities will be disabled until you re-index products via an optimization run.")) {
      return;
    }
    setClearing(true);
    setError("");
    try {
      await api.clearVectorDb();
      loadData(1, pageSize, "", "");
    } catch (err: any) {
      setError(err.message || "Failed to clear Vector DB.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="panel" style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <p className="eyebrow" style={{ color: "#126166", fontWeight: 700, margin: "0 0 4px" }}>
            Vector Store Inspector
          </p>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#163b43" }}>
            CockroachDB Vector Store Inspector
          </h2>
          <p style={{ margin: "6px 0 0", color: "#5e757a", fontSize: "0.9rem" }}>
            Inspect embedded product vectors, factual GEO treatment bundles, and run semantic similarity searches against the active vector database.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={handleClearDb}
            disabled={loading || clearing}
            style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b91c1c", borderColor: "#fca5a5", background: "#fee2e2" }}
          >
            {clearing ? "Clearing…" : "Clear Vector DB"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => loadData(page, pageSize, searchQuery, selectedCategory)}
            disabled={loading || clearing}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#b91c1c", marginBottom: "20px", fontSize: "0.9rem" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Top Status Cards matching main theme metrics */}
      <div className="metric-grid" aria-live="polite" style={{ marginBottom: "24px" }}>
        <article className="metric-card">
          <span>Total Indexed Vectors</span>
          <strong>{statusData ? formatNumber(statusData.count) : "—"}</strong>
          <small style={{ color: "#126166", display: "block", marginTop: "4px" }}>
            CockroachDB Table: <strong>{statusData?.collection_name || "product_vectors"}</strong>
          </small>
        </article>

        <article className="metric-card">
          <span>Vector Store Status</span>
          <strong style={{ color: statusData?.status === "online" ? "#126166" : "#5e757a", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: statusData?.status === "online" ? "#126166" : "#5e757a", display: "inline-block" }}></span>
            {statusData?.status === "online" ? "ONLINE" : "UNKNOWN"}
          </strong>
          <small style={{ color: "#5e757a", display: "block", marginTop: "4px" }}>
            Similarity Mode: <strong>L2 Cosine Distance</strong>
          </small>
        </article>

        <article className="metric-card">
          <span>Embedding Function</span>
          <strong style={{ fontSize: "1.05rem" }}>
            {statusData?.embedding_function || "OpenAI"}
          </strong>
          <small style={{ color: "#5e757a", display: "block", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Path: <code>{statusData?.path || "cockroachdb"}</code>
          </small>
        </article>
      </div>

      {/* Semantic Search Box */}
      <form onSubmit={handleSearchSubmit} style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #d7e3e4", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 280px" }}>
            <input
              type="text"
              placeholder="Search Vector DB using semantic similarity query (e.g. messenger bag, earbuds, silver ring)..."
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #c6dada",
                fontSize: "0.85rem",
                color: "#163b43",
              }}
            />
          </div>

          <div style={{ flex: "0 0 200px" }}>
            <select
              value={selectedCategory}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #c6dada",
                fontSize: "0.85rem",
                color: "#163b43",
                background: "#ffffff",
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" className="primary-button" style={{ padding: "8px 16px", fontSize: "0.85rem", fontWeight: 700 }}>
              Semantic Search
            </button>
            {(searchQuery || selectedCategory) && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleReset}
                style={{ padding: "8px 14px", fontSize: "0.85rem" }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
        {searchQuery && (
          <div style={{ marginTop: "10px", fontSize: "0.85rem", color: "#126166" }}>
            Showing vector similarity matches for: <strong>"{searchQuery}"</strong>
          </div>
        )}
      </form>

      {/* Indexed Products List */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#163b43" }}>
            Indexed Products & Vector Records ({formatNumber(totalProducts)})
          </h3>
          <span style={{ fontSize: "0.85rem", color: "#5e757a" }}>
            Click any product to inspect factual GEO treatment bundle & metadata
          </span>
        </div>

        {loading && products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#5e757a" }}>
            Loading vector database records…
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #d7e3e4", color: "#5e757a" }}>
            No products found matching your vector search query.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {products.map((prod, idx) => {
              const isExpanded = expandedId === prod.id;
              const condition = prod.condition || "CONTROL";
              const isGeo = condition === "GEO_OPTIMIZED";
              const score = prod.retrieval_score ?? prod.score;
              const bundle = prod.geo_bundle;

              return (
                <div
                  key={prod.id || idx}
                  style={{
                    background: "#ffffff",
                    borderRadius: "8px",
                    border: isExpanded ? "1px solid #126166" : "1px solid #c6dada",
                    overflow: "hidden",
                    transition: "all 0.15s ease",
                    boxShadow: isExpanded ? "0 4px 12px rgba(18, 97, 102, 0.08)" : "0 1px 2px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : prod.id)}
                    style={{
                      padding: "14px 18px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      background: isExpanded ? "#f4f7f7" : "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: "#f4f7f7",
                          border: "1px solid #c6dada",
                          color: "#163b43",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          flexShrink: 0,
                        }}
                      >
                        {prod.rank_position || (page - 1) * pageSize + idx + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#163b43", fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {prod.title || "Untitled Product"}
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px", fontSize: "0.75rem", color: "#5e757a" }}>
                          <span>ID: <code>{prod.id}</code></span>
                          <span>·</span>
                          <span>Category: <strong>{prod.category || "General"}</strong></span>
                          {prod.price && (
                            <>
                              <span>·</span>
                              <span>Price: ₹{prod.price}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                      {score !== undefined && (
                        <div style={{ background: "#def3ed", color: "#126166", padding: "4px 10px", borderRadius: "16px", fontSize: "0.75rem", fontWeight: 700, border: "1px solid #afd2cf" }}>
                          Similarity: {(score * 100).toFixed(1)}%
                        </div>
                      )}

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
                        {isExpanded ? "Hide Details" : "View Details"}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        padding: "16px 18px",
                        background: "#f8fafc",
                        borderTop: "1px solid #d7e3e4",
                        fontSize: "0.9rem",
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                        <div>
                          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#5e757a", textTransform: "uppercase" }}>
                            Vector Store Metadata
                          </div>
                          <ul style={{ margin: "8px 0 0", paddingLeft: "18px", color: "#163b43", fontSize: "0.85rem" }}>
                            <li>Product ID: <strong>{prod.id}</strong></li>
                            <li>Category: <strong>{prod.category}</strong></li>
                            <li>Condition: <strong>{condition}</strong></li>
                            <li>Run ID: <code>{prod.run_id || "Standard Catalog"}</code></li>
                          </ul>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#5e757a", textTransform: "uppercase" }}>
                            GEO Treatment Summary
                          </div>
                          {bundle ? (
                            <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "#163b43" }}>
                              {bundle.optimized_title && (
                                <div style={{ marginBottom: "6px" }}>
                                  <strong style={{ color: "#126166" }}>Optimized Title:</strong> {bundle.optimized_title}
                                </div>
                              )}
                              {bundle.claim_blocks && bundle.claim_blocks.length > 0 && (
                                <div style={{ fontSize: "0.8rem", color: "#126166" }}>
                                  <strong>{bundle.claim_blocks.length} Factual Claim Block(s)</strong> indexed for citation linking.
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "#5e757a" }}>
                              Standard control product (no GEO treatment modifications indexed).
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#5e757a", textTransform: "uppercase", marginBottom: "8px" }}>
                          Full Vector Metadata Record (JSON)
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: "12px",
                            background: "#0d1b1e",
                            color: "#d1fae5",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            maxHeight: "320px",
                            overflow: "auto",
                            fontFamily: "monospace",
                          }}
                        >
                          {JSON.stringify(prod, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination controls with Go-to-Page and Page size dropdown */}
        {totalProducts > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid #d7e3e4",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "0.85rem", color: "#5e757a" }}>
              Showing <strong>{(page - 1) * pageSize + 1}</strong>–
              <strong>{Math.min(page * pageSize, totalProducts)}</strong> of{" "}
              <strong>{formatNumber(totalProducts)}</strong> indexed products
            </div>

            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#f4f7f7",
                  padding: "4px 12px",
                  borderRadius: "8px",
                  border: "1px solid #c6dada",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "#5e757a", fontWeight: 600 }}>
                  Page size:
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value, 10);
                    setPageSize(newSize);
                    setPage(1);
                    loadData(1, newSize, searchQuery, selectedCategory);
                  }}
                  style={{
                    padding: "4px 8px",
                    border: "1px solid #126166",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#163b43",
                    background: "#ffffff",
                    outline: "none",
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#f4f7f7",
                  padding: "4px 12px",
                  borderRadius: "8px",
                  border: "1px solid #c6dada",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "#5e757a", fontWeight: 600 }}>
                  Go to page:
                </span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={page}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      const clamped = Math.max(1, Math.min(totalPages, val));
                      setPage(clamped);
                      loadData(clamped, pageSize, searchQuery, selectedCategory);
                    }
                  }}
                  aria-label="Go to vector page number"
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
                <span style={{ fontSize: "0.85rem", color: "#5e757a" }}>
                  of <strong>{totalPages}</strong>
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || loading}
                  style={{ padding: "6px 14px", fontSize: "0.8rem", fontWeight: 600 }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages || loading}
                  style={{ padding: "6px 14px", fontSize: "0.8rem", fontWeight: 600 }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
