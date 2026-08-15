import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type WheelEvent,
} from "react";
import { api } from "../api/client";
import type { Citation, EventType, Product, StudyConfig, StudySession } from "../types";
import { categoryIcon, formatPrice, calculateDiscountPercentage } from "../utils/formatters";
import { ConsentModal } from "./ConsentModal";
import { Modal } from "./Modal";
import { ProductDetailView } from "./ProductDetailView";
import { SurveyModal } from "./SurveyModal";

type ChatMessage = {
  id: string;
  author: "assistant" | "participant" | "error";
  text: string;
  citations?: Citation[];
  queryId?: string;
  suggestions?: string[];
};

function FormattedMessage({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <div className="formatted-message">
      {paragraphs.map((para, i) => {
        const parts = para.split(/(\[C\d+\]|\*\*.*?\*\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) => {
              if (part.match(/^\[C\d+\]$/)) {
                return <span key={j} className="inline-citation">{part}</span>;
              }
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j}>{part.slice(2, -2)}</strong>;
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

const promptExamples = [
  "Recommend wireless earbuds under ₹5000",
  "Compare smart TVs for my living room",
  "Good non-slip yoga mat?"
];

interface ParticipantExperienceProps {
  config: StudyConfig | null;
  products: Product[];
  catalogCategory: string;
  catalogTotal: number;
  hasMoreProducts: boolean;
  loading: boolean;
  isLoadingMore: boolean;
  loadError: string;
  session: StudySession | null;
  isStarting: boolean;
  onStartSession: (details: { participantCode?: string; country?: string; aiFamiliarity?: string }) => Promise<unknown>;
  onCategoryChange: (category: string) => void;
  onLoadMoreProducts: () => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function ParticipantExperience({
  config,
  products,
  catalogCategory,
  catalogTotal,
  hasMoreProducts,
  loading,
  isLoadingMore,
  loadError,
  session,
  isStarting,
  onStartSession,
  onCategoryChange,
  onLoadMoreProducts,
  currentPage: propCurrentPage,
  onPageChange,
}: ParticipantExperienceProps) {
  const [consentOpen, setConsentOpen] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);

  const [catalogSelectedProduct, setCatalogSelectedProduct] = useState<Product | null>(null);
  const [chatInlineProduct, setChatInlineProduct] = useState<{product: Product, messageId: string} | null>(null);
  const [comparisons, setComparisons] = useState<Product[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: "welcome",
    author: "assistant",
    text: "Hi! I'm your AI shopping assistant for Amazon India. Tell me what you are looking for.",
  }]);
  const [query, setQuery] = useState("");
  const [lastQueryId, setLastQueryId] = useState<string | undefined>();
  const [isQuerying, setIsQuerying] = useState(false);
  const [surveyComplete, setSurveyComplete] = useState(false);
  const nextMessageId = useRef(1);
  const searchInputRef = useRef<HTMLTextAreaElement>(null);
  const categoryRailRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [categoryRailState, setCategoryRailState] = useState({
    canScrollBackward: false,
    canScrollForward: false,
  });
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const currentPage = propCurrentPage ?? localCurrentPage;
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const PRODUCTS_PER_PAGE = 8;

  const categories = useMemo(() => Array.from(new Set([
    ...(config?.categories || []),
    ...products.map((product) => product.category),
  ].filter(Boolean))), [config, products]);

  // Reset to page 1 when category changes
  useEffect(() => {
    if (!onPageChange) {
      setLocalCurrentPage(1);
    }
  }, [catalogCategory, onPageChange]);

  const totalPages = Math.max(1, Math.ceil(catalogTotal / PRODUCTS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const visibleProducts = products;

  function goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, totalPages));
    if (onPageChange) {
      onPageChange(clamped);
    } else {
      setLocalCurrentPage(clamped);
    }
    // Scroll catalog pane to top
    const catalogPane = document.querySelector('.storefront-catalog-pane');
    if (catalogPane) catalogPane.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function getPaginationRange(): (number | '...')[] {
    const range: (number | '...')[] = [];
    if (totalPages <= 9) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      if (currentPage > 4) range.push('...');
      const start = Math.max(2, currentPage - 2);
      const end = Math.min(totalPages - 1, currentPage + 2);
      for (let i = start; i <= end; i++) range.push(i);
      if (currentPage < totalPages - 3) range.push('...');
      range.push(totalPages);
    }
    return range;
  }

  useEffect(() => {
    const rail = categoryRailRef.current;
    if (!rail) return undefined;

    const updateRailControls = () => {
      const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
      setCategoryRailState({
        canScrollBackward: rail.scrollLeft > 2,
        canScrollForward: rail.scrollLeft < maxScrollLeft - 2,
      });
    };

    updateRailControls();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(updateRailControls);
    observer?.observe(rail);
    window.addEventListener("resize", updateRailControls);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateRailControls);
    };
  }, [categories.length]);

  // Auto-scroll transcript to bottom when messages change or query is loading
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, isQuerying]);

  function addMessage(message: Omit<ChatMessage, "id">) {
    const next = { ...message, id: `message-${nextMessageId.current++}` };
    setMessages((previous) => [...previous, next]);
  }

  function record(
    eventType: EventType,
    productId?: string,
    metadata: Record<string, unknown> = {},
    queryId: string | undefined = lastQueryId,
  ) {
    if (!session) return;
    void api.recordEvent({
      session_id: session.session_id,
      event_type: eventType,
      product_id: productId,
      query_id: queryId,
      metadata,
    }).catch(() => undefined);
  }

  function openProduct(product: Product, source: "catalog" | "citation", queryId?: string) {
    setCatalogSelectedProduct(product);
    record(source === "citation" ? "citation_open" : "product_open", product.id, { source }, queryId);
  }

  function trackPurchaseIntent(product: Product) {
    record("purchase_intent", product.id);
  }

  function addComparison(product: Product) {
    if (comparisons.some((item) => item.id === product.id) || comparisons.length >= 4) return;
    const next = [...comparisons, product];
    setComparisons(next);
    record("comparison_add", product.id, { comparison_size: next.length });
  }

  function focusSearch() {
    if (!session) {
      setConsentOpen(true);
      return;
    }
    searchInputRef.current?.focus();
  }

  function chooseCategory(category: string) {
    onCategoryChange(category);
  }

  function updateCategoryRailControls() {
    const rail = categoryRailRef.current;
    if (!rail) return;
    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    setCategoryRailState({
      canScrollBackward: rail.scrollLeft > 2,
      canScrollForward: rail.scrollLeft < maxScrollLeft - 2,
    });
  }

  function scrollCategoryRail(direction: -1 | 1) {
    const rail = categoryRailRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.76, 260),
      behavior: "smooth",
    });
  }

  function handleCategoryRailKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const rail = categoryRailRef.current;
    if (!rail) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollCategoryRail(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollCategoryRail(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      rail.scrollTo({ left: 0, behavior: "smooth" });
    } else if (event.key === "End") {
      event.preventDefault();
      rail.scrollTo({ left: rail.scrollWidth, behavior: "smooth" });
    }
  }

  function handleCategoryRailWheel(event: WheelEvent<HTMLDivElement>) {
    const rail = categoryRailRef.current;
    if (!rail || (!event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY))) return;
    const movement = event.deltaX || event.deltaY;
    if (!movement) return;
    event.preventDefault();
    rail.scrollBy({ left: movement, behavior: "auto" });
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.closest("form");
      if (form) {
        form.requestSubmit();
      }
    }
  };

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (!session) {
      setConsentOpen(true);
      return;
    }
    if (!text || isQuerying) return;
    setCatalogSelectedProduct(null);
    addMessage({ author: "participant", text });
    setQuery("");
    setIsQuerying(true);
    try {
      const result = await api.askAssistant({
        session_id: session.session_id,
        query: text,
        category_filter: catalogCategory || undefined,
      });
      setLastQueryId(result.query_id);
      addMessage({ 
        author: "assistant", 
        text: result.answer, 
        citations: result.citations, 
        queryId: result.query_id,
        suggestions: result.suggestions
      });
    } catch (reason) {
      addMessage({ author: "error", text: reason instanceof Error ? reason.message : "The assistant could not complete that search." });
    } finally {
      setIsQuerying(false);
    }
  }

  function openSurvey() {
    if (!session) {
      setConsentOpen(true);
      return;
    }
    record("survey_open");
    setSurveyOpen(true);
  }

  async function submitSurvey(answers: Record<string, string>) {
    if (!session) return;
    await api.submitSurvey({ session_id: session.session_id, answers });
    setSurveyComplete(true);
    addMessage({ author: "assistant", text: "Thank you. Your questionnaire has been saved. You may now close this page." });
  }

  return (
    <section className="participant-storefront" aria-labelledby="participant-heading">
      <div className="storefront-utility-bar">
        <p>GEO Shopping Study</p>
        <p>Research catalog only. No purchases or payment information.</p>
      </div>

      <header className="storefront-header">
        <button className="storefront-brand" type="button" onClick={() => chooseCategory("")} aria-label="Catalog Corner home">
          <span className="storefront-brand-mark" aria-hidden="true"><span /></span>
          <span><strong>Catalog Corner</strong><small>Product discovery study</small></span>
        </button>
        <div className="storefront-header-actions">
          <button className="storefront-link" type="button" onClick={() => chooseCategory("")}>Browse catalog</button>
          <button className="storefront-session-action" type="button" onClick={() => {
            if (!session) {
              setConsentOpen(true);
            } else {
              setIsChatOpen(true);
              setTimeout(focusSearch, 100);
            }
          }}>
            <span className={`status-dot ${session ? "active" : ""}`} aria-hidden="true" />
            {session ? "Session ready" : "Start study"}
          </button>
        </div>
      </header>

      <div className="storefront-split-layout">
        {/* Left Pane: Catalog */}
        <div className="storefront-catalog-pane">
          <section className="storefront-hero premium-hero" aria-labelledby="participant-heading">
            <div className="storefront-hero-copy">
              <p className="eyebrow">Research catalog</p>
              <h1 id="participant-heading">Find products for the way you live.</h1>
              <p>Browse product details and compare the options that fit your needs.</p>
              {!session && (
                <button className="secondary-button storefront-consent-button" type="button" onClick={() => setConsentOpen(true)}>
                  Read consent to begin
                </button>
              )}
            </div>
            <aside className="storefront-hero-panel premium-hero-panel" aria-label="Study session status" aria-live="polite">
              <div className="hero-panel-orbit" aria-hidden="true">
                <span className="orbit-circle-1" />
                <span className="orbit-circle-2" />
                <span className="orbit-circle-3" />
              </div>
              <p className="eyebrow panel-eyebrow">Your study session</p>
              <h2>{session ? "Ready when you are" : "One short step first"}</h2>
              <p>
                {session
                  ? `Session ${session.participant_code} is active. Your searches and product interactions are recorded.`
                  : "Read the consent information before using the assistant."}
              </p>
              <button className="hero-panel-action" type="button" onClick={focusSearch}>
                {session ? "Ask a product question" : "Start study"}
              </button>
            </aside>
          </section>

          <div className="study-notice storefront-study-notice">
            <span className="notice-symbol" aria-hidden="true">i</span>
            <span>{config?.participant_notice || "For the study, catalog pages may present factual product information in different formats. Please judge products as you normally would."}</span>
          </div>

          <section className="department-section" aria-labelledby="department-heading">
            <div className="section-heading storefront-section-heading">
              <div>
                <p className="eyebrow">Shop by department</p>
                <h2 id="department-heading">Start with a category</h2>
              </div>
              <div className="department-heading-actions">
                {catalogCategory && <button className="text-button department-reset" type="button" onClick={() => chooseCategory("")}>Show all products</button>}
                <div className="department-rail-controls" role="group" aria-label="Department navigation">
                  <button
                    className="department-rail-control"
                    type="button"
                    onClick={() => scrollCategoryRail(-1)}
                    disabled={!categoryRailState.canScrollBackward}
                    aria-label="Show previous departments"
                    aria-controls="department-rail"
                  >
                    <span aria-hidden="true">‹</span>
                  </button>
                  <button
                    className="department-rail-control"
                    type="button"
                    onClick={() => scrollCategoryRail(1)}
                    disabled={!categoryRailState.canScrollForward}
                    aria-label="Show more departments"
                    aria-controls="department-rail"
                  >
                    <span aria-hidden="true">›</span>
                  </button>
                </div>
              </div>
            </div>
            <div
              ref={categoryRailRef}
              id="department-rail"
              className="department-shortcuts"
              aria-label="Product departments. Use left and right arrow keys to scroll."
              role="region"
              tabIndex={0}
              onScroll={updateCategoryRailControls}
              onKeyDown={handleCategoryRailKeyDown}
              onWheel={handleCategoryRailWheel}
            >
              <div className="department-rail-items">
                <button
                  className={`department-shortcut ${catalogCategory === "" ? "active" : ""}`}
                  type="button"
                  onClick={() => chooseCategory("")}
                  aria-pressed={catalogCategory === ""}
                >
                  <span className="department-icon department-icon-all" aria-hidden="true">{categoryIcon("All products")}</span>
                  <span>All products</span>
                </button>
                {categories.map((category, index) => (
                  <button
                    className={`department-shortcut department-tone-${index % 4} ${catalogCategory === category ? "active" : ""}`}
                    type="button"
                    key={category}
                    onClick={() => chooseCategory(category)}
                    aria-pressed={catalogCategory === category}
                  >
                    <span className="department-icon" aria-hidden="true">{categoryIcon(category)}</span>
                    <span>{category}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="catalogue-section storefront-catalogue-section" aria-labelledby="catalogue-heading">
            <div className="section-heading storefront-section-heading">
              <div>
                <p className="eyebrow">Catalog browse</p>
                <h2 id="catalogue-heading">{catalogCategory || "Featured catalog products"}</h2>
              </div>
              <p className="muted">
                {loading
                  ? "Loading catalog..."
                  : catalogTotal === 0 || visibleProducts.length === 0
                    ? "No products available"
                    : `Showing ${pageStartIndex + 1}–${Math.min(pageStartIndex + visibleProducts.length, catalogTotal)} of ${catalogTotal.toLocaleString()}`}
              </p>
            </div>
            {loadError && <p className="form-error">{loadError}</p>}
            <div className="product-grid storefront-product-grid">
              {loading && Array.from({ length: PRODUCTS_PER_PAGE }, (_, index) => (
                <article className="product-card catalog-card product-card-skeleton" key={`skeleton-${index}`} aria-label="Loading catalog product" aria-busy="true">
                  <div className="catalog-media" />
                  <span className="skeleton-line short" />
                  <span className="skeleton-line" />
                  <span className="skeleton-line medium" />
                </article>
              ))}
              {!loading && visibleProducts.map((product) => (
                <article className="product-card catalog-card" key={product.id}>
                  <div className={`catalog-media ${product.image_url ? "catalog-media-has-image" : ""}`} aria-hidden="true">
                    <span className="catalog-media-fallback">{categoryIcon(product.category)}</span>
                    {product.image_url && <img src={product.image_url} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
                  </div>
                  <div className="product-meta catalog-card-meta">
                    <span>{product.category}{product.sub_category ? ` • ${product.sub_category}` : ""}</span>
                    <span>{product.brand || "Catalog item"}</span>
                  </div>
                  <h3>{product.title}</h3>
                  <p className="product-description">{product.description || "Product information is available in the catalog."}</p>
                  {(product.key_features || []).length > 0 && (
                    <ul className="feature-list catalog-feature-list">
                      {(product.key_features || []).slice(0, 2).map((feature) => <li key={feature}>{feature}</li>)}
                    </ul>
                  )}
                  <div className="product-footer catalog-card-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{formatPrice(product)}</strong>
                      {product.actual_price && Number(product.actual_price) > Number(product.price || 0) && (
                        <span style={{ textDecoration: 'line-through', color: '#64748b', fontSize: '0.85rem' }}>
                          {formatPrice({ price: product.actual_price, currency: product.currency })}
                        </span>
                      )}
                      {(() => {
                        const discountPct = calculateDiscountPercentage(product.discount_price, product.actual_price, product.price);
                        return discountPct ? (
                          <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.45rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                            {discountPct}% OFF
                          </span>
                        ) : null;
                      })()}
                    </div>
                    {product.rating ? <span style={{ fontSize: '0.85rem', color: '#475569' }}>Rating {product.rating} <small>({Number(product.review_count || 0).toLocaleString()})</small></span> : null}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    <button className="text-button catalog-detail-link" type="button" onClick={() => openProduct(product, "catalog")} style={{ flex: 1, textAlign: 'left', fontWeight: 600 }}>
                      View product details →
                    </button>
                    {product.source_url && (
                      <a
                        href={product.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="catalog-card-buy-btn"
                        onClick={() => trackPurchaseIntent(product)}
                        title="Buy on Amazon (opens in new tab)"
                        aria-label={`Buy ${product.title} on Amazon in a new tab`}
                        style={{
                          padding: '0.4rem 0.7rem',
                          background: '#fff7ed',
                          color: '#c2410c',
                          border: '1px solid #fdba74',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        Buy ↗
                      </a>
                    )}
                  </div>
                </article>
              ))}
              {!loading && visibleProducts.length === 0 && <p className="muted catalog-empty">No products are available for this category.</p>}
            </div>

            {/* Pagination Controls */}
            {!loading && catalogTotal > PRODUCTS_PER_PAGE && (
              <nav className="pagination-controls" aria-label="Catalog pagination">
                <button
                  className="pagination-btn pagination-prev"
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  Prev
                </button>

                <div className="pagination-pages">
                  {getPaginationRange().map((item, index) => (
                    item === '...' ? (
                      <span className="pagination-ellipsis" key={`ellipsis-${index}`}>…</span>
                    ) : (
                      <button
                        className={`pagination-page ${currentPage === item ? 'active' : ''}`}
                        type="button"
                        key={item}
                        onClick={() => goToPage(item)}
                        aria-current={currentPage === item ? 'page' : undefined}
                      >
                        {item}
                      </button>
                    )
                  ))}
                </div>

                <button
                  className="pagination-btn pagination-next"
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "16px", background: "#f4f7f7", padding: "4px 12px", borderRadius: "8px", border: "1px solid #c6dada" }}>
                  <span style={{ fontSize: "0.85rem", color: "#5e757a", fontWeight: 600 }}>Go to page:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        goToPage(val);
                      }
                    }}
                    aria-label="Go to catalog page number"
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
                  <span style={{ fontSize: "0.85rem", color: "#5e757a" }}>of <strong>{totalPages}</strong></span>
                </div>
              </nav>
            )}
            {comparisons.length > 0 && (
              <div className="compare-tray storefront-compare-tray" aria-live="polite">
                <div>
                  <strong>Compare list ({comparisons.length})</strong>
                  <span>{comparisons.map((product) => product.title).join(" | ")}</span>
                </div>
                <button className="text-button" type="button" onClick={() => setComparisons([])}>Clear list</button>
              </div>
            )}
          </section>


        </div>

        {/* Floating Premium Sticky Assistant */}
        <div className={`storefront-assistant-pane ${isChatOpen ? 'open' : 'closed'} ${isChatMaximized ? 'maximized' : ''}`}>
          <section className="premium-assistant-desk" aria-labelledby="assistant-heading" style={{ position: 'relative' }}>
            <header className="premium-assistant-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 id="assistant-heading">AI Assistant</h2>
                <div className="assistant-status-row">
                  <span className={`assistant-status ${session ? "active" : ""}`}>
                    {session ? "Online" : "Consent needed"}
                  </span>
                </div>
              </div>
              <div className="assistant-header-actions" style={{ display: 'flex', gap: '0.25rem' }}>
                <button className="close-assistant-btn" onClick={() => setIsChatMaximized(!isChatMaximized)} aria-label={isChatMaximized ? "Restore Assistant" : "Maximize Assistant"}>
                  {isChatMaximized ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                  )}
                </button>
                <button className="close-assistant-btn" onClick={() => setIsChatOpen(false)} aria-label="Close Assistant">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </header>

            <div className="premium-assistant-transcript" aria-live="polite" aria-label="Shopping assistant conversation" ref={transcriptRef}>
              {messages.map((message) => (
                    <div className={`premium-message-row ${message.author}-row`} key={message.id}>
                      <div className={`premium-message ${message.author}-message`}>
                        <FormattedMessage text={message.text} />
                        {message.citations && message.citations.length > 0 && (
                          <div className="premium-citation-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '12px',
                            marginTop: '16px'
                          }}>
                            {message.citations.map((citation, index) => (
                              <div className="premium-citation-card-square" key={citation.product.id} style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                padding: '12px',
                                background: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                              }}>
                                {citation.product.image_url && (
                                  <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', background: '#f8fafc', borderRadius: '4px' }} onClick={() => {
                                    record("citation_open", citation.product.id, { source: "citation_image" }, message.queryId);
                                    setChatInlineProduct({ product: citation.product, messageId: message.id as string });
                                  }}>
                                    <img src={citation.product.image_url} alt="" loading="lazy" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} onError={(event) => { event.currentTarget.hidden = true; }} />
                                  </div>
                                )}
                                <div style={{ fontSize: '0.85rem', fontWeight: '600', lineHeight: '1.3', flexGrow: 1, cursor: 'pointer' }} onClick={() => {
                                    record("citation_open", citation.product.id, { source: "citation_title" }, message.queryId);
                                    setChatInlineProduct({ product: citation.product, messageId: message.id as string });
                                }}>
                                  <span style={{ color: '#0ea5e9', marginRight: '4px' }}>[C{index + 1}]</span>
                                  {citation.product.title.length > 70 ? citation.product.title.substring(0, 70) + "..." : citation.product.title}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                                  <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{formatPrice(citation.product)}</span>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => {
                                        record("citation_open", citation.product.id, { source: "citation_view" }, message.queryId);
                                        setChatInlineProduct({ product: citation.product, messageId: message.id as string });
                                      }} style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer', color: '#334155' }}>View</button>
                                    <a href={citation.product.source_url} target="_blank" rel="noopener noreferrer" onClick={() => {
                                      record("purchase_intent", citation.product.id, { source: "citation_buy" }, message.queryId);
                                    }} style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', background: '#0ea5e9', color: 'white', border: '1px solid #0ea5e9', cursor: 'pointer', textDecoration: 'none' }}>Buy Now</a>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {chatInlineProduct && chatInlineProduct.messageId === message.id && (
                          <div style={{ marginTop: '1rem', width: '100%', maxWidth: '1000px', padding: 0, overflow: 'hidden' }}>
                            <ProductDetailView product={chatInlineProduct.product} onClose={() => setChatInlineProduct(null)} onBuyClick={trackPurchaseIntent} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isQuerying && (
                    <div className="premium-message-row assistant-row">
                       <div className="premium-message assistant-message typing-indicator-message">
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                       </div>
                    </div>
                  )}

                  {!isQuerying && messages.length > 0 && messages[messages.length - 1].author === "assistant" && (
                    <div className="premium-suggested-queries">
                      <p className="suggested-queries-label">Suggested follow-ups</p>
                      <div className="premium-prompt-chips">
                        {((messages[messages.length - 1].suggestions && messages[messages.length - 1].suggestions!.length > 0) ? messages[messages.length - 1].suggestions : promptExamples)!.map((prompt: string) => (
                          <button
                            type="button"
                            key={prompt}
                            onClick={() => session ? setQuery(prompt) : setConsentOpen(true)}
                          >
                            {prompt.replace(/\.$/, "")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  </div>
                  
                  {!surveyComplete && session && messages.filter(m => m.author === 'participant').length < 5 && (
                      <div className="survey-progress-banner" style={{
                        background: '#f8fafc',
                        borderTop: '1px solid #e2e8f0',
                        borderBottom: '1px solid #e2e8f0',
                      }}>
                        <div style={{
                          maxWidth: '1000px',
                          margin: '0 auto',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          fontSize: '0.9rem',
                          color: '#475569'
                        }}>
                          <span><strong>Task Progress:</strong> Ask {5 - messages.filter(m => m.author === 'participant').length} more question{5 - messages.filter(m => m.author === 'participant').length > 1 ? 's' : ''} to unlock the feedback survey.</span>
                          
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {[...Array(5)].map((_, i) => (
                              <div key={i} style={{
                                width: '32px',
                                height: '8px',
                                borderRadius: '4px',
                                background: i < messages.filter(m => m.author === 'participant').length ? '#0ea5e9' : '#cbd5e1',
                                transition: 'background 0.3s ease'
                              }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!surveyComplete && session && messages.filter(m => m.author === 'participant').length >= 5 && (
                    <div className="survey-banner" style={{
                      background: '#f0f9ff',
                      borderTop: '1px solid #bae6fd',
                      borderBottom: '1px solid #bae6fd',
                    }}>
                      <div style={{
                        maxWidth: '1000px',
                        margin: '0 auto',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        fontSize: '0.9rem',
                        color: '#0369a1'
                      }}>
                        <span><strong>Feedback Request:</strong> Please take a moment to complete our quick questionnaire.</span>
                        <button onClick={openSurvey} style={{
                          background: '#0ea5e9',
                          color: 'white',
                          border: 'none',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}>Take Survey</button>
                      </div>
                    </div>
                  )}

                <div className="premium-assistant-input-area">
                  
                  <form className="premium-search-form" onSubmit={submitSearch}>
                    <label className="sr-only" htmlFor="query-input">Ask the shopping assistant</label>
                    <div className="premium-search-input-wrapper">
                      <textarea
                        id="query-input"
                        ref={searchInputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder={session ? "Message Assistant..." : "Start study to chat"}
                        disabled={!session || isQuerying}
                      />
                      <button 
                        className="premium-search-submit" 
                        type="submit" 
                        disabled={!session || isQuerying || !query.trim()} 
                        aria-label="Send message"
                        onClick={(e) => {
                          if (!session || isQuerying || !query.trim()) {
                            e.preventDefault();
                            return;
                          }
                          // Explicitly call submitSearch for browsers where SVG intercepts submit
                          submitSearch(e as any);
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                      </button>
                    </div>
                  </form>
                </div>

          </section>
        </div>
      </div>

      <Modal
        open={!!catalogSelectedProduct}
        onClose={() => setCatalogSelectedProduct(null)}
        titleId="catalog-product-title"
        className="product-modal"
      >
        {catalogSelectedProduct && (
             <ProductDetailView 
               product={catalogSelectedProduct} 
               onClose={() => setCatalogSelectedProduct(null)} 
               onBuyClick={trackPurchaseIntent}
             />
        )}
      </Modal>

      <ConsentModal
        open={consentOpen}
        onClose={() => setConsentOpen(false)}
        studyName={config?.study_name || "the GEO shopping study"}
        isStarting={isStarting}
        onStart={onStartSession}
      />
      <SurveyModal open={surveyOpen} onClose={() => setSurveyOpen(false)} onSubmit={submitSurvey} />
      
      {/* Floating Chat Button */}
      {!isChatOpen && (
        <button className="floating-chat-btn" onClick={() => {
          if (!session) {
            setConsentOpen(true);
          } else {
            setIsChatOpen(true);
            setTimeout(focusSearch, 100);
          }
        }} aria-label="Open AI Assistant">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          {session ? "Chat" : "Start Study to Chat"}
        </button>
      )}
    </section>
  );
}
