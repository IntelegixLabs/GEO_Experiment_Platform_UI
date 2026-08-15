export type Condition = "CONTROL" | "GEO_OPTIMIZED" | string;

export interface ProductPage {
  description?: string;
  summary?: string;
  key_features?: string[];
  specifications?: Record<string, string>;
  faq?: Array<{ question: string; answer: string }>;
  claim_blocks?: Array<{ claim: string; evidence: string }>;
}

export interface Product {
  id: string;
  sku?: string;
  title: string;
  category: string;
  main_category?: string;
  sub_category?: string;
  brand?: string;
  summary?: string;
  description?: string;
  key_features?: string[];
  price?: number | string | null;
  discount_price?: number | string | null;
  actual_price?: number | string | null;
  currency?: string;
  rating?: number | string | null;
  review_count?: number | string | null;
  availability?: string;
  shipping?: string;
  return_policy?: string;
  /** Optional study-approved product asset. Participant components must use a visual fallback when it is absent. */
  image_url?: string;
  /** Retained for transparent catalog provenance; do not render as a participant-facing outbound link without protocol approval. */
  source_url?: string;
  product_page?: ProductPage;
  // Researcher-only fields are intentionally not used by participant components.
  condition?: Condition;
  pair_id?: string | null;
  citations?: number;
  opportunities?: number;
  geo_bundle?: Record<string, any> | null;
}

export interface StudyConfig {
  study_name: string;
  categories: string[];
  environment?: string;
  catalog_seed_mode?: "configured_csv" | "fictional_demo" | string;
  participant_notice?: string;
}

export interface StudySession {
  session_id: string;
  participant_code: string;
  study_cohort?: string;
}

export interface Citation {
  product: Product;
  rank_position: number;
  recommendation_score?: number;
  reasons: string[];
  evidence_markers?: string[];
}

export interface SearchIntent {
  tokens: string[];
  category_filter: string | null;
  max_price: number | null;
  comparison: boolean;
  decision: boolean;
  evidence_need: boolean;
}

export interface AssistantQueryResponse {
  query_id: string;
  answer: string;
  citations: Citation[];
  intent: SearchIntent;
  suggestions?: string[];
}

export interface AssistantResponse {
  query_id: string;
  answer: string;
  citations: Citation[];
  intent?: Record<string, unknown>;
  suggestions?: string[];
}

export interface ConditionMetric {
  condition: Condition;
  candidate_opportunities: number;
  citation_events: number;
  citation_rate: number | null;
  top3_rate?: number | null;
  mean_retrieval_score: number | null;
  mean_evidence_score?: number | null;
  engagement_events: number;
  engagement_per_citation: number | null;
  purchase_events?: number;
  purchases_per_citation?: number | null;
}

export interface DashboardData {
  totals: {
    products: number;
    sessions: number;
    queries: number;
    completed_surveys: number;
  };
  by_condition: ConditionMetric[];
  survey_means: Record<string, number>;
  catalogue_balance: Array<{ category: string; condition: Condition; products: number }>;
  interpretation_note?: string;
}

export interface ProbeCandidate {
  rank_position: number;
  product_id: string;
  title: string;
  category: string;
  condition: Condition;
  retrieval_score: number;
  lexical_score: number;
  semantic_score: number;
  evidence_score: number;
  cited: boolean;
}

export interface ProbeRun {
  probe_run_id: string;
  repetition: number;
  cited_products: string[];
  cited_conditions?: Condition[];
  answer?: string;
  candidates?: ProbeCandidate[];
}

export interface ProbeResponse {
  ok: boolean;
  query: string;
  probe_set: string;
  engine_name: string;
  model_version: string;
  runs: ProbeRun[];
  message?: string;
}

export interface ImportResponse {
  imported: number;
  control: number;
  geo_optimized: number;
  message: string;
}

export type GeoOptimizationScopeType = "all_catalog" | "categories" | "product_ids" | "pair_ids" | string;
export type GeoOptimizationAssignmentStrategy = "stratified_split" | "matched_pairs" | string;
export type GeoOptimizationModelProfile = "factual_structure" | "evidence_first" | "balanced_retrieval" | "custom" | string;

/**
 * Researcher-only configuration for the deterministic GEO treatment generator
 * and transparent controlled retriever. This is deliberately distinct from a
 * participant-facing product record.
 */
export interface GeoOptimizationScope {
  type: GeoOptimizationScopeType;
  categories: string[];
  product_ids: string[];
  pair_ids: string[];
  limit?: number | null;
}

export interface GeoOptimizationConfig {
  id?: string;
  name: string;
  optimization_target?: "citation_visibility" | "balanced_visibility" | "decision_quality" | string;
  model_profile: GeoOptimizationModelProfile;
  model_name: string;
  model_version: string;
  treatment_percentage: number;
  assignment_strategy: GeoOptimizationAssignmentStrategy;
  random_seed: string;
  parameter_weights: Record<string, number>;
  feature_toggles: Record<string, boolean>;
  scope: GeoOptimizationScope;
  is_active?: boolean;
  last_applied_at?: string | null;
}

export interface GeoOptimizationOption {
  value: string;
  label?: string;
  description?: string;
}

export interface GeoOptimizationOptions {
  model_profiles?: Array<GeoOptimizationOption | string>;
  assignment_strategies?: Array<GeoOptimizationOption | string>;
  scope_types?: Array<GeoOptimizationOption | string>;
  parameter_weights?: Record<string, { label?: string; min?: number; max?: number; step?: number }>;
  feature_toggles?: Record<string, { label?: string; description?: string }>;
  categories?: string[];
  [key: string]: unknown;
}

export interface GeoOptimizationScopeSummary {
  [key: string]: unknown;
}

export interface GeoOptimizationConfigResponse {
  config: GeoOptimizationConfig;
  options: GeoOptimizationOptions;
  scope_summary: GeoOptimizationScopeSummary;
}

export interface GeoOptimizationApplication {
  run_id: string | null;
  dry_run: boolean;
  selected_products: number;
  updated_products: number;
  control_products: number;
  geo_optimized_products: number;
  actual_treatment_percentage: number | null;
  scope: GeoOptimizationScopeSummary;
  assignment_strategy: GeoOptimizationAssignmentStrategy;
  integrity_failures: number;
  integrity_failure_details?: Array<{ product_id: string; error: string }>;
  skipped_product_ids: string[];
  warning?: string | null;
}

export interface GeoOptimizationApplyResponse {
  config: GeoOptimizationConfig;
  application: GeoOptimizationApplication;
}

export interface GeoOptimizationApplyPayload {
  name?: string;
  optimization_target?: "citation_visibility" | "balanced_visibility" | "decision_quality" | string;
  model_profile?: GeoOptimizationModelProfile;
  model_name?: string;
  model_version?: string;
  treatment_percentage?: number;
  assignment_strategy?: GeoOptimizationAssignmentStrategy;
  random_seed?: string;
  parameter_weights?: Record<string, number>;
  feature_toggles?: Record<string, boolean>;
  scope?: GeoOptimizationScope;
  dry_run?: boolean;
  /** Required by the API when a catalog has already been exposed to study data. */
  confirm_reconfiguration?: boolean;
}

export interface AnalyticsRespondent {
  respondent_id: string;
  study_cohort?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  query_count: number;
  event_count?: number;
  product_open_events?: number;
  citation_open_events?: number;
  comparison_events?: number;
  purchase_intent_events?: number;
  survey_completed: boolean;
  survey_scores?: Record<string, number | null>;
  conditions?: Record<string, {
    candidate_opportunities?: number;
    citation_events?: number;
    engagement_events?: number;
  }>;
}

export interface AnalyticsFunnelStep {
  stage: string;
  count: number;
  rate?: number | null;
}

export interface AnalyticsConditionMetric {
  condition: Condition;
  candidate_opportunities: number;
  citation_events: number;
  citation_rate?: number | null;
  top3_events?: number;
  top3_rate?: number | null;
  engagement_events?: number;
  engagement_per_citation?: number | null;
  product_open_events?: number;
  citation_open_events?: number;
  comparison_events?: number;
  purchase_intent_events?: number;
}

export interface AnalyticsSurveyConstruct {
  construct: string;
  n: number;
  mean?: number | null;
  minimum?: number | null;
  maximum?: number | null;
  distribution?: Array<{ score: number; count: number }>;
}

export interface AnalyticsTimelinePoint {
  date: string;
  queries?: number;
  active_sessions?: number;
  events?: number;
  surveys_completed?: number;
}

export interface AnalyticsCategoryEffect {
  category: string;
  condition: Condition;
  candidate_opportunities: number;
  citation_events: number;
  citation_rate?: number | null;
  engagement_events?: number;
  engagement_per_citation?: number | null;
  mean_retrieval_score?: number | null;
  mean_evidence_score?: number | null;
}

/**
 * Aggregated researcher-only data. The API deliberately returns no raw query
 * text, product decisions, location values, or contact information here.
 */
export interface AnalyticsReport {
  generated_at?: string;
  privacy?: {
    consented_sessions_only?: boolean;
    respondent_rows_are_pseudonymous?: boolean;
    raw_fields_excluded?: string[];
  };
  totals: {
    consented_sessions?: number;
    completed_surveys?: number;
    survey_completion_rate?: number | null;
    queries?: number;
    sessions_with_queries?: number;
    events?: number;
  };
  survey?: { constructs: AnalyticsSurveyConstruct[] };
  survey_distributions?: AnalyticsSurveyConstruct[];
  timeline: AnalyticsTimelinePoint[];
  funnel: AnalyticsFunnelStep[];
  conditions?: AnalyticsConditionMetric[];
  category_effects?: AnalyticsCategoryEffect[];
  respondents?: {
    items: AnalyticsRespondent[];
    total: number;
    limit: number;
    offset?: number;
    has_more: boolean;
  };
  notes?: string[];
}

export type EventType =
  | "product_open"
  | "citation_open"
  | "citation_interaction"
  | "comparison_add"
  | "purchase_intent"
  | "survey_open";
