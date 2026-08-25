export type BrowserAgentMode = "assisted" | "auto";

export type BrowserAgentJobKind =
  | "google_flow_image"
  | "google_flow_video"
  | "kalodata_research"
  | "open_tools";

export type BrowserAgentJobStatus =
  | "queued"
  | "running"
  | "waiting_user"
  | "completed"
  | "failed"
  | "cancelled";

export interface BrowserAgentJob {
  id: string;
  kind: BrowserAgentJobKind;
  status: BrowserAgentJobStatus;
  prompt?: string;
  negativePrompt?: string;
  referencePaths: string[];
  sourceImagePath?: string;
  productName?: string;
  resultImagePath?: string;
  resultImageUrl?: string;
  logs: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrowserAgentRunInput {
  kind: BrowserAgentJobKind;
  prompt?: string;
  negativePrompt?: string;
  referencePaths?: string[];
  sourceImagePath?: string;
  productName?: string;
  headless?: boolean;
}
