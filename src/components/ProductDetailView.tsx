import type { Product } from "../types";
import { categoryIcon, formatPrice, calculateDiscountPercentage } from "../utils/formatters";
interface ProductDetailViewProps {
  product: Product | null;
  onClose: () => void;
}

/** Participant-only product presentation, rendered inside the chat pane. */
export function ProductDetailView({
  product,
  onClose,
}: ProductDetailViewProps) {
  if (!product) return null;
  const page = product.product_page;
  const features = page?.key_features?.length ? page.key_features : product.key_features || [];
  const specifications = Object.entries(page?.specifications || {});
  const claims = page?.claim_blocks || [];
  const faq = page?.faq || [];

  return (
    <div className="product-detail-view" style={{ flex: 1, padding: '0.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
      <button 
        type="button" 
        onClick={onClose} 
        aria-label="Close product details"
        style={{ position: 'absolute', top: 0, right: 0, background: 'transparent', border: 'none', color: '#6b7c80', cursor: 'pointer', padding: '0.5rem' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <header className="detail-header" style={{ marginTop: '0', paddingRight: '2rem' }}>
        <div className={`product-visual large retail-product-visual detail-product-visual category-${product.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} aria-hidden="true">
          <span className="visual-glyph">{categoryIcon(product.category)}</span>
          {product.image_url && <img src={product.image_url} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span className="eyebrow" style={{ margin: 0 }}>{product.category}</span>
            {product.sub_category && (
              <>
                <span style={{ color: '#9ca3af' }}>•</span>
                <span className="eyebrow" style={{ margin: 0, color: '#4f46e5' }}>{product.sub_category}</span>
              </>
            )}
          </div>
          <h2 id="product-title">{product.title}</h2>
          <p className="detail-brand">{product.brand || "Catalog item"}</p>
          {product.rating !== null && product.rating !== undefined && product.rating !== "" && (
            <p className="product-rating" aria-label={`Rated ${product.rating}${product.review_count ? ` from ${Number(product.review_count).toLocaleString()} ratings` : ""}`}>
              <span aria-hidden="true">Rating</span> <strong>{product.rating}</strong>
              {product.review_count ? <small> ({Number(product.review_count).toLocaleString()} ratings)</small> : null}
            </p>
          )}
        </div>
      </header>

      <div className="detail-price-box" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '0.5rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: 800 }}>{formatPrice(product)}</strong>
          {product.actual_price && Number(product.actual_price) > Number(product.price || 0) && (
            <span style={{ textDecoration: 'line-through', color: '#64748b', fontSize: '1.15rem', fontWeight: 500 }}>
              {formatPrice({ price: product.actual_price, currency: product.currency })}
            </span>
          )}
          {(() => {
            const discountPct = calculateDiscountPercentage(product.discount_price, product.actual_price, product.price);
            return discountPct ? (
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 700, border: '1px solid #bbf7d0', letterSpacing: '0.025em' }}>
                {discountPct}% OFF
              </span>
            ) : null;
          })()}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: '#475569' }}>
            {product.availability || "Catalog availability not supplied"}
          </span>
          {product.actual_price && Number(product.actual_price) > Number(product.price || 0) && (
            <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
              You save {formatPrice({ price: Number(product.actual_price) - Number(product.price || 0), currency: product.currency })}
            </span>
          )}
        </div>

        {product.source_url ? (
          <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              href={product.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="buy-on-amazon-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.75rem',
                background: 'linear-gradient(135deg, #ff9900 0%, #ff8800 100%)',
                color: '#111111',
                fontWeight: 700,
                fontSize: '0.95rem',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(255, 153, 0, 0.3)',
                transition: 'all 0.2s ease',
              }}
              aria-label={`Buy ${product.title} on Amazon in a new tab`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Buy on Amazon
            </a>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Opens original product page in a new tab
            </span>
          </div>
        ) : null}
      </div>

      <p className="detail-description">{page?.description || product.description || "Product information is available in this study catalog."}</p>

      {features.length > 0 && (
        <section>
          <h3>Key product features</h3>
          <ul className="feature-list detail-features">{features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
        </section>
      )}

      {specifications.length > 0 && (
        <section className="structured-section">
          <h3>Product details</h3>
          <dl className="spec-list">{specifications.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>
      )}

      {claims.length > 0 && (
        <section className="structured-section">
          <h3>Supporting product information</h3>
          <ul className="claim-list">{claims.map((claim, index) => <li key={`${claim.claim}-${index}`}><strong>{claim.claim}</strong><span>{claim.evidence}</span></li>)}</ul>
        </section>
      )}

      {faq.length > 0 && (
        <section className="structured-section">
          <h3>Common questions</h3>
          {faq.map((item, index) => <details key={`${item.question}-${index}`}><summary>{item.question}</summary><p>{item.answer}</p></details>)}
        </section>
      )}

      <section className="detail-offer" aria-label="Catalog fulfillment information">
        <span>Shipping: {product.shipping || "Not supplied"}</span>
        <span>Returns: {product.return_policy || "Not supplied"}</span>
      </section>

      {product.condition === "GEO_OPTIMIZED" && product.geo_bundle && (
        <details className="structured-section" style={{ marginTop: '1rem', background: '#f0faf8', padding: '1rem', borderRadius: '8px', border: '1px solid #afd2cf' }}>
          <summary style={{ fontWeight: 700, color: '#126166', cursor: 'pointer' }}>Optimization Summary (What was modified)</summary>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#163b43' }}>
            {product.geo_bundle.summary && (
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#126166' }}>Factual Summary:</strong>
                <p style={{ margin: '4px 0 0' }}>{product.geo_bundle.summary}</p>
              </div>
            )}
            {product.geo_bundle.specifications && Object.keys(product.geo_bundle.specifications).length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#126166' }}>Structured Specifications:</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', marginTop: '4px' }}>
                  {Object.entries(product.geo_bundle.specifications).map(([k, v]) => (
                    <div key={k} style={{ display: 'contents' }}>
                      <span style={{ fontWeight: 700 }}>{k}:</span>
                      <span>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {product.geo_bundle.claim_blocks && product.geo_bundle.claim_blocks.length > 0 && (
              <div>
                <strong style={{ color: '#126166' }}>Claim-Evidence Links:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                  {product.geo_bundle.claim_blocks.map((block: any, i: number) => (
                    <li key={i}>
                      <strong>{block.claim}</strong> — <span style={{ color: '#5e757a' }}>{block.evidence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

    </div>
  );
}
