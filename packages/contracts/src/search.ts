export type SearchResultType = "opportunity" | "answer" | "profile";

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  snippet?: string;
  metadata?: Record<string, string>;
}

export interface GlobalSearchResponse {
  query: string;
  results: SearchResultItem[];
}
