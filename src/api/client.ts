import type {
  AssistantResponse,
  AnalyticsReport,
  DashboardData,
  EventType,
  GeoOptimizationApplyPayload,
  GeoOptimizationApplyResponse,
  GeoOptimizationConfigResponse,
  ImportResponse,
  ProbeResponse,
  Product,
  StudyConfig,
  StudySession,
} from "../types";

const baseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export type CatalogPage = {
  products: Product[];
  total: number;
  limit: number;
  offset: number;
};

export type CatalogRequest = {
  category?: string;
  limit?: number;
  offset?: number;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("The study server is unavailable. Please check that the API is running.");
  }

  const payload = (await response.json().catch(() => ({}))) as { error?: string; detail?: string } & T;
  if (!response.ok) {
    throw new ApiError(payload.error || payload.detail || "The study server could not complete that request.", response.status);
  }
  return payload;
}

function jsonBody(payload: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(payload) };
}

export const api = {
  adminVerify: (credentials: { username: string; password: string }) => request<{ success: boolean }>("/verify", jsonBody(credentials)),
  getConfig: () => request<StudyConfig>("/config"),
  getProducts: ({ category, limit, offset }: CatalogRequest = {}) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (limit !== undefined) params.set("limit", String(limit));
    if (offset !== undefined) params.set("offset", String(offset));
    const query = params.size ? `?${params.toString()}` : "";
    return request<CatalogPage>(`/products${query}`);
  },
  getResearchProducts: () => request<{ products: Product[] }>("/research/products"),
  getDashboard: () => request<DashboardData>("/dashboard"),
  getAnalyticsReport: (respondentLimit = 100, respondentOffset = 0) =>
    request<AnalyticsReport>(
      "/admin/analytics/report?respondent_limit=" + encodeURIComponent(String(respondentLimit))
      + "&respondent_offset=" + encodeURIComponent(String(respondentOffset)),
    ),
  getGeoOptimizationConfig: () => request<GeoOptimizationConfigResponse>("/admin/geo-optimization/config"),
  applyGeoOptimization: async (
    payload: GeoOptimizationApplyPayload,
    onProgress?: (progress: any) => void
  ): Promise<GeoOptimizationApplyResponse> => {
    const url = `${baseUrl}/admin/geo-optimization/apply${payload.dry_run ? "" : "?stream=true"}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || errorPayload.detail || `Server returned ${response.status}`);
    }
    
    const contentType = response.headers.get("content-type") || "";
    if (payload.dry_run || !response.body || contentType.includes("application/json")) {
        return response.json();
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.status === "error") {
                  throw new Error(data.message || "GEO optimization failed");
              } else if (data.status === "complete" || (data.config && data.application)) {
                  return { config: data.config, application: data.application } as GeoOptimizationApplyResponse;
              } else if (data.status === "progress" && onProgress) {
                  onProgress(data);
              }
            } catch (parseError) {
              console.warn('Failed to parse NDJSON line:', line);
              continue;
            }
        }
    }
    
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer);
        if (data.status === 'complete' || (data.config && data.application)) return { config: data.config, application: data.application } as GeoOptimizationApplyResponse;
        if (data.status === 'error') throw new ApiError(data.message || 'GEO optimization failed', 500);
        if (onProgress && data.status === 'progress') onProgress(data);
      } catch { /* ignore incomplete final chunk */ }
    }
    
    throw new Error("Stream ended without completion message");
  },
  createSession: (payload: {
    consent: boolean;
    participant_code?: string;
    email?: string;
    age?: number;
    country?: string;
    ai_familiarity?: string;
    study_cohort?: string;
  }) => request<StudySession>("/sessions", jsonBody(payload)),
  askAssistant: (payload: { session_id: string; query: string; category_filter?: string }) =>
    request<AssistantResponse>("/assistant/query", jsonBody(payload)),
  recordEvent: (payload: {
    session_id: string;
    event_type: EventType;
    product_id?: string;
    query_id?: string;
    metadata?: Record<string, unknown>;
  }) => request<{ ok: boolean }>("/events", jsonBody(payload)),
  submitSurvey: (payload: { session_id: string; answers: Record<string, string> }) =>
    request<{ ok: boolean; scale_scores?: Record<string, number | null> }>("/surveys", jsonBody(payload)),
  runProbe: (payload: {
    query: string;
    probe_set?: string;
    repetitions?: number;
    category_filter?: string;
    engine_name?: string;
    model_version?: string;
    locale?: string;
  }) => request<ProbeResponse>("/admin/probes", jsonBody(payload)),
  importProducts: (csv: string) => request<ImportResponse>("/admin/products/import", jsonBody({ csv })),
  getGeoOptimizationRuns: () => request<any[]>("/admin/geo-optimization/runs"),
  getGeoOptimizationRunProducts: (runId: string) =>
    request<Product[]>(`/admin/geo-optimization/runs/${encodeURIComponent(runId)}/products`),
  getVectorDbStatus: () => request<any>("/admin/vectordb/status"),
  getVectorDbProducts: (params: { page: number; limit: number; query?: string; category_filter?: string }) => {
    const q = new URLSearchParams();
    q.set("page", String(params.page));
    q.set("limit", String(params.limit));
    if (params.query) q.set("query", params.query);
    if (params.category_filter) q.set("category_filter", params.category_filter);
    return request<any>(`/admin/vectordb/products?${q.toString()}`);
  },
  clearVectorDb: () => request<{ status: string; message: string }>("/admin/vector-db/clear", { method: "DELETE" }),
  getDemographics: () => request<{ demographics: { country: string; count: number }[] }>("/admin/respondents/demographics"),
  getRespondents: (params: { page: number; limit: number; query?: string; cohort?: string }) => {
    const q = new URLSearchParams();
    q.set("page", String(params.page));
    q.set("limit", String(params.limit));
    if (params.query) q.set("query", params.query);
    if (params.cohort) q.set("cohort", params.cohort);
    return request<any>(`/admin/respondents?${q.toString()}`);
  },
  getRespondentActivity: (sessionId: string) =>
    request<any>(`/admin/respondents/${encodeURIComponent(sessionId)}/activity`),
  exportUrl: (dataset: string) => `${baseUrl}/export/${encodeURIComponent(dataset)}`,
};
