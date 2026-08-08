import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api/client";
import { ParticipantExperience } from "./components/ParticipantExperience";
import { ResearcherConsole } from "./components/ResearcherConsole";
import { AdminLogin } from "./components/AdminLogin";
import { useStudySession } from "./hooks/useStudySession";
import type { Product, StudyConfig } from "./types";

type View = "participant" | "researcher";

const CATALOG_PAGE_SIZE = 8;

export default function App() {
  const [view, setView] = useState<View>(() => (
    new URLSearchParams(window.location.search).get("mode") === "researcher" ? "researcher" : "participant"
  ));
  const [config, setConfig] = useState<StudyConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogCategory, setCatalogCategory] = useState("");
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogNextOffset, setCatalogNextOffset] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { session, isStarting, startSession } = useStudySession();
  const catalogRequestId = useRef(0);

  const refreshCatalog = useCallback(async () => {
    const requestId = ++catalogRequestId.current;
    setLoading(true);
    setIsLoadingMore(false);
    setLoadError("");
    try {
      const [nextConfig, catalog] = await Promise.all([
        api.getConfig(),
        api.getProducts({
          category: catalogCategory || undefined,
          limit: CATALOG_PAGE_SIZE,
          offset: (currentPage - 1) * CATALOG_PAGE_SIZE,
        }),
      ]);
      if (requestId !== catalogRequestId.current) return;
      setConfig(nextConfig);
      setProducts(catalog.products);
      setCatalogTotal(catalog.total);
      setCatalogNextOffset(catalog.offset + catalog.products.length);
    } catch (reason) {
      if (requestId !== catalogRequestId.current) return;
      setLoadError(reason instanceof Error ? reason.message : "The study catalog could not be loaded.");
    } finally {
      if (requestId === catalogRequestId.current) setLoading(false);
    }
  }, [catalogCategory, currentPage]);

  useEffect(() => { void refreshCatalog(); }, [refreshCatalog]);

  const loadMoreProducts = useCallback(async () => {
    if (loading || isLoadingMore || catalogNextOffset >= catalogTotal) return;

    const requestId = ++catalogRequestId.current;
    setIsLoadingMore(true);
    setLoadError("");
    try {
      const catalog = await api.getProducts({
        category: catalogCategory || undefined,
        limit: CATALOG_PAGE_SIZE,
        offset: catalogNextOffset,
      });
      if (requestId !== catalogRequestId.current) return;

      setProducts((current) => {
        const currentIds = new Set(current.map((product) => product.id));
        return [...current, ...catalog.products.filter((product) => !currentIds.has(product.id))];
      });
      setCatalogTotal(catalog.total);
      setCatalogNextOffset(catalog.offset + catalog.products.length);
    } catch (reason) {
      if (requestId !== catalogRequestId.current) return;
      setLoadError(reason instanceof Error ? reason.message : "More catalog products could not be loaded.");
    } finally {
      if (requestId === catalogRequestId.current) setIsLoadingMore(false);
    }
  }, [catalogCategory, catalogNextOffset, catalogTotal, isLoadingMore, loading]);

  const selectCatalogCategory = useCallback((category: string) => {
    setCatalogCategory(category);
    setCurrentPage(1);
  }, []);

  function selectView(nextView: View) {
    setView(nextView);
    const url = new URL(window.location.href);
    if (nextView === "researcher") {
      url.searchParams.set("mode", "researcher");
    } else {
      url.searchParams.delete("mode");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      {view === "participant" && (
        <main className="storefront-main">
          <ParticipantExperience
            config={config}
            products={products}
            catalogCategory={catalogCategory}
            catalogTotal={catalogTotal}
            hasMoreProducts={catalogNextOffset < catalogTotal}
            loading={loading}
            isLoadingMore={isLoadingMore}
            loadError={loadError}
            session={session}
            isStarting={isStarting}
            onStartSession={startSession}
            onCategoryChange={selectCatalogCategory}
            onLoadMoreProducts={loadMoreProducts}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </main>
      )}
      {view === "researcher" && (
        !isAuthenticated ? (
          <AdminLogin onLogin={() => setIsAuthenticated(true)} />
        ) : (
          <ResearcherConsole
            categories={config?.categories || []}
            onCatalogImported={refreshCatalog}
            onReturnToCatalog={() => selectView("participant")}
          />
        )
      )}
    </>
  );
}
