import { useState, useId } from "react";
import { api } from "../api/client";
import type { Product } from "../types";

interface AgenticGeoLabProps {
  products: Product[];
}

export function AgenticGeoLab({ products }: AgenticGeoLabProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [plannedStrategies, setPlannedStrategies] = useState<string[]>([]);
  const [planning, setPlanning] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [optimizedProduct, setOptimizedProduct] = useState<Product | null>(null);
  const [evalResults, setEvalResults] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handlePlan = async () => {
    if (!selectedProduct) return;
    const prod = products.find(p => p.id === selectedProduct);
    if (!prod) return;

    setPlanning(true);
    setPlannedStrategies([]);
    setOptimizedProduct(null);
    setEvalResults(null);
    try {
      const res = await api.post("/geo/plan", { product: prod });
      setPlannedStrategies(res.strategies || []);
    } catch (e) {
      console.error(e);
      alert("Failed to plan strategies.");
    } finally {
      setPlanning(false);
    }
  };

  const handleRewrite = async () => {
    if (!selectedProduct) return;
    const prod = products.find(p => p.id === selectedProduct);
    if (!prod) return;

    setRewriting(true);
    try {
      const res = await api.post("/geo/rewrite", { product: prod, strategies: plannedStrategies });
      setOptimizedProduct(res.optimized_product);
    } catch (e) {
      console.error(e);
      alert("Failed to rewrite product.");
    } finally {
      setRewriting(false);
    }
  };

  const handleEvaluate = async () => {
    if (!selectedProduct || !optimizedProduct || !searchQuery) return;
    const orig = products.find(p => p.id === selectedProduct);
    if (!orig) return;

    setEvaluating(true);
    try {
      // Pick 5 random products from the same category as competitors
      const competitors = products
        .filter(p => p.category === orig.category && p.id !== orig.id)
        .slice(0, 5);

      const res = await api.post("/geo/evaluate", {
        query: searchQuery,
        original_product: orig,
        optimized_product: optimizedProduct,
        competitors: competitors
      });
      setEvalResults(res);
    } catch (e) {
      console.error(e);
      alert("Failed to evaluate product.");
    } finally {
      setEvaluating(false);
    }
  };

  const toggleStrategy = (strategy: string) => {
    if (plannedStrategies.includes(strategy)) {
      setPlannedStrategies(plannedStrategies.filter(s => s !== strategy));
    } else {
      setPlannedStrategies([...plannedStrategies, strategy]);
    }
  };

  const STRATEGY_CATALOG = [
    "Authoritative",
    "Statistics Addition",
    "Cite Sources",
    "Fluency Optimization",
    "Quotations",
    "User Reviews",
    "Competitiveness",
    "Format"
  ];

  return (
    <div className={`geo-lab-layout ${optimizedProduct ? 'has-results' : ''}`}>
      {/* LEFT COLUMN: Input & Strategies */}
      <div className="geo-left-col">
        <section className="panel" style={{ marginBottom: "2rem" }}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Interactive testing</p>
              <h2>1. Select Product</h2>
            </div>
          </div>
          <p style={{ color: "#536e73", fontSize: "0.86rem", marginBottom: "1rem" }}>Choose a product from your catalog to analyze and optimize its content.</p>
          
          <select 
            className="geo-select"
            value={selectedProduct} 
            onChange={(e) => setSelectedProduct(e.target.value)}
            style={{ marginBottom: "1rem", width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #c8d6d6" }}
          >
            <option value="">-- Choose a product --</option>
            {products.slice(0, 100).map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          
          <button 
            className="primary-button" 
            onClick={handlePlan} 
            disabled={!selectedProduct || planning}
            style={{ width: "100%" }}
          >
            {planning ? (
              <><svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeDashoffset="24" opacity="0.3"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path></svg> Analyzing...</>
            ) : "Plan Strategies"}
          </button>
        </section>

        {plannedStrategies.length > 0 && (
          <section className="panel" style={{ marginBottom: "2rem" }}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Configuration</p>
                <h2>2. Refine Strategies</h2>
              </div>
            </div>
            <p className="geo-section-desc">
              The agent has selected optimal strategies based on the category. Toggle the chips below to override its plan.
            </p>
            
            <div className="geo-strategy-grid">
              {STRATEGY_CATALOG.map(strat => (
                <button 
                  key={strat}
                  type="button"
                  onClick={() => toggleStrategy(strat)}
                  className={`geo-strategy-chip ${plannedStrategies.includes(strat) ? 'active' : ''}`}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {strat}
                </button>
              ))}
            </div>

            <button 
              className="primary-button" 
              onClick={handleRewrite} 
              disabled={rewriting || plannedStrategies.length === 0}
              style={{ width: "100%" }}
            >
              {rewriting ? (
                <><svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeDashoffset="24" opacity="0.3"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path></svg> Rewriting Content...</>
              ) : "Execute Rewrite"}
            </button>
          </section>
        )}
      </div>

      {/* RIGHT COLUMN: Output & Evaluation */}
      <div className="geo-right-col">
        {optimizedProduct && (
          <>
            <section className="panel" style={{ marginBottom: "2rem" }}>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Results</p>
                  <h2>3. Optimized Content</h2>
                </div>
              </div>
              <p style={{ color: "#536e73", fontSize: "0.86rem", marginBottom: "1rem" }}>The rewritten product profile applying the selected strategies while preserving factuality.</p>
              
              <div className="geo-content-block">
                <h4>Summary</h4>
                <p>{optimizedProduct.summary}</p>
              </div>
              <div className="geo-content-block">
                <h4>Description</h4>
                <p>{optimizedProduct.description}</p>
              </div>
            </section>

            <section className="panel" style={{ marginBottom: "2rem" }}>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Validation</p>
                  <h2>4. GEO-Bench Evaluation</h2>
                </div>
              </div>
              <p style={{ color: "#536e73", fontSize: "0.86rem", marginBottom: "1rem" }}>Simulate a Generative Engine response to calculate rank gain, keyword violations, and perplexity.</p>
              
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <input 
                  className="geo-input"
                  type="text" 
                  placeholder="Enter a search query..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button 
                  className="secondary-button" 
                  onClick={handleEvaluate} 
                  disabled={!searchQuery || evaluating}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {evaluating ? "Evaluating..." : "Run Eval"}
                </button>
              </div>

              {evalResults && (
                <div className="geo-metric-dashboard">
                  <div className={`geo-metric-card ${evalResults.nrg > 0 ? 'highlight' : ''}`}>
                    <span className="geo-metric-label">Normalized Rank Gain</span>
                    <span className="geo-metric-value">{evalResults.nrg}</span>
                    <span className="geo-metric-sub">Rank jumped {evalResults.rank_before} → {evalResults.rank_after}</span>
                  </div>
                  
                  <div className={`geo-metric-card ${evalResults.success_10 === 1 ? 'highlight' : ''}`}>
                    <span className="geo-metric-label">Success@10</span>
                    <span className="geo-metric-value">{evalResults.success_10 === 1 ? "Yes" : "No"}</span>
                    <span className="geo-metric-sub">Top 10% of results</span>
                  </div>
                  
                  <div className={`geo-metric-card ${evalResults.kvr > 0 ? 'warning' : ''}`}>
                    <span className="geo-metric-label">Keyword Violation (KVR)</span>
                    <span className="geo-metric-value">{evalResults.kvr}</span>
                    <span className="geo-metric-sub">{evalResults.kvr > 0 ? "Spammy phrases detected" : "Passed stealth check"}</span>
                  </div>
                  
                  <div className="geo-metric-card">
                    <span className="geo-metric-label">Perplexity Ratio</span>
                    <span className="geo-metric-value">{evalResults.ppl_r}</span>
                    <span className="geo-metric-sub">Lower is more fluent</span>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
