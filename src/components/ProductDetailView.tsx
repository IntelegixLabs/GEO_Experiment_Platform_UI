import type { Product } from "../types";
import { categoryIcon, formatPrice, calculateDiscountPercentage } from "../utils/formatters";

interface ProductDetailViewProps {
  product: Product | null;
  onClose: () => void;
  onBuyClick?: (product: Product) => void;
}

/** Participant-only product presentation, rendered inside the chat pane. */
export function ProductDetailView({
  product,
  onClose,
  onBuyClick,
}: ProductDetailViewProps) {
  if (!product) return null;
  
  const page = product.product_page;
  const features = page?.key_features?.length ? page.key_features : product.key_features || [];
  const specifications = Object.entries(page?.specifications || {});
  const claims = page?.claim_blocks || [];
  const faq = page?.faq || [];

  return (
    <div className="product-detail-view" style={{ 
      background: '#ffffff', 
      border: '1px solid #e2e8f0', 
      borderRadius: '10px', 
      padding: '1rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1rem', 
      position: 'relative',
      boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)'
    }}>
      
      {/* Close Button */}
      <button 
        type="button" 
        onClick={onClose} 
        aria-label="Close product details"
        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: '#f8fafc', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', zIndex: 10 }}
        onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
        onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Left Column: Image */}
        <div style={{ 
          background: '#f8fafc', 
          borderRadius: '6px', 
          height: '180px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '1rem',
          border: '1px solid #f1f5f9'
        }}>
          {product.image_url ? (
            <img src={product.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }} onError={(event) => { event.currentTarget.hidden = true; }} />
          ) : (
            <div style={{ color: '#cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem' }}>{categoryIcon(product.category)}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>No image</span>
            </div>
          )}
        </div>

        {/* Right Column: Key Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {product.category}
              </span>
              {product.sub_category && (
                <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                  › {product.sub_category}
                </span>
              )}
            </div>
            
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
              {product.title}
            </h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>{product.brand || "Catalog item"}</span>
              
              {product.rating !== null && product.rating !== undefined && product.rating !== "" && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: '#fef3c7', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#d97706" stroke="#d97706" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  <strong style={{ color: '#92400e', fontSize: '0.8rem' }}>{product.rating}</strong>
                  {product.review_count && <span style={{ color: '#b45309', fontSize: '0.75rem' }}>({Number(product.review_count).toLocaleString()})</span>}
                </div>
              )}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: 800, lineHeight: 1 }}>{formatPrice(product)}</strong>
              
              {product.actual_price && Number(product.actual_price) > Number(product.price || 0) && (
                <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.95rem', fontWeight: 500 }}>
                  {formatPrice({ price: product.actual_price, currency: product.currency })}
                </span>
              )}
              
              {(() => {
                const discountPct = calculateDiscountPercentage(product.discount_price, product.actual_price, product.price);
                return discountPct ? (
                  <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 700 }}>
                    {discountPct}% OFF
                  </span>
                ) : null;
              })()}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {product.availability || "Catalog availability not supplied"}
              </div>

              {product.source_url && (
                <a
                  href={product.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onBuyClick?.(product)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.75rem',
                    background: '#0ea5e9',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#0284c7'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#0ea5e9'}
                >
                  Buy Now
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
              )}
            </div>
          </div>
          
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {page?.description || product.description ? (
          <div>
            <h3 style={{ fontSize: '0.9rem', color: '#0f172a', margin: '0 0 0.25rem 0', fontWeight: 600 }}>About this item</h3>
            <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
              {page?.description || product.description}
            </p>
          </div>
        ) : null}

        {features.length > 0 && (
          <div>
            <h3 style={{ fontSize: '0.9rem', color: '#0f172a', margin: '0 0 0.25rem 0', fontWeight: 600 }}>Key Features</h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#334155', fontSize: '0.85rem', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              {features.map((feature, i) => <li key={i}>{feature}</li>)}
            </ul>
          </div>
        )}

        {specifications.length > 0 && (
          <div>
            <h3 style={{ fontSize: '0.9rem', color: '#0f172a', margin: '0 0 0.4rem 0', fontWeight: 600 }}>Specifications</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.4rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              {specifications.map(([label, value]) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 500, lineHeight: 1.2 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {claims.length > 0 && (
          <div>
            <h3 style={{ fontSize: '0.9rem', color: '#0f172a', margin: '0 0 0.4rem 0', fontWeight: 600 }}>Verified Claims</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {claims.map((claim, index) => (
                <div key={index} style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 600, color: '#0f766e', fontSize: '0.85rem', marginBottom: '0.15rem', lineHeight: 1.2 }}>{claim.claim}</div>
                  <div style={{ color: '#115e59', fontSize: '0.75rem', lineHeight: 1.3 }}>{claim.evidence}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
