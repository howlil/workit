export type SemanticFieldType =
  | "full_name"
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "location"
  | "linkedin"
  | "portfolio"
  | "github"
  | "summary"
  | "unknown";

export type FieldConfidenceState = "ready" | "needs_review" | "unsupported";

export interface FieldSignals {
  tag: string;
  type: string;
  id: string;
  name: string;
  autocomplete: string;
  placeholder: string;
  ariaLabel: string;
  labelText: string;
  nearbyText: string;
}

export interface DetectedField {
  id: string;
  element: HTMLElement;
  signals: FieldSignals;
  semanticType: SemanticFieldType;
  confidence: number;
  state: FieldConfidenceState;
}

export interface FieldFillPlanItem {
  field: DetectedField;
  resolvedValue: string;
  approved: boolean;
  status: "pending" | "filled" | "verification_failed" | "skipped";
}

export interface AutofillPlan {
  items: FieldFillPlanItem[];
  readyCount: number;
  reviewCount: number;
}
