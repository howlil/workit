import type {
  JobCandidate,
  OpportunityState,
  SaveOpportunityResponse,
  FullCareerProfile,
  JobMatchAnalysis,
  SearchResultItem,
  SearchResultType,
} from "@workit/contracts";
import type {
  Opportunity,
  JobSnapshot,
  AnswerMemoryItem,
} from "@workit/domain";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface ToolPropertySchema {
  type: string;
  description?: string;
  enum?: string[];
  items?: ToolPropertySchema;
  properties?: Record<string, ToolPropertySchema>;
  required?: string[];
}

export interface ToolInputSchema {
  type: "object";
  properties: Record<string, ToolPropertySchema>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

export interface ToolContentItem {
  type: "text";
  text: string;
}

export interface ToolCallResult {
  content: ToolContentItem[];
  isError?: boolean;
}

export interface OpportunityDetail {
  opportunity: Opportunity;
  currentSnapshot: JobSnapshot | null;
}

/**
 * Service contracts needed by the MCP server.
 * Both CLI (local memory/sqlite) and Worker (D1 bindings) can provide these services.
 */
export interface McpServices {
  searchOpportunities(
    userId: string,
    options: { query?: string; state?: OpportunityState; limit?: number }
  ): Promise<any[]>;

  getOpportunity(userId: string, id: string): Promise<OpportunityDetail | null>;

  saveOpportunity(userId: string, candidate: JobCandidate): Promise<SaveOpportunityResponse>;

  getCareerProfile(userId: string): Promise<FullCareerProfile>;

  findAnswerMatch(userId: string, question: string): Promise<AnswerMemoryItem | null>;

  saveAnswer(
    userId: string,
    input: { questionText: string; answerText: string; category?: string }
  ): Promise<AnswerMemoryItem>;

  matchJobEvidence(userId: string, jobDescription: string): Promise<JobMatchAnalysis>;

  searchGlobal(
    userId: string,
    query: string,
    scope?: SearchResultType | "all"
  ): Promise<SearchResultItem[]>;

  startApplication(userId: string, opportunityId: string): Promise<any>;

  confirmSubmission(
    userId: string,
    applicationId: string,
    data: { snapshotId: string; submittedAt?: string; resumeArtifactId?: string; answers?: any[] }
  ): Promise<any>;
}

export interface McpServerConfig {
  services: McpServices;
  userId?: string;
  serverName?: string;
  serverVersion?: string;
}
