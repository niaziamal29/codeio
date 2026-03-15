/**
 * API request/response type definitions.
 *
 * Defines the contract between frontend and backend.
 * All API responses follow a consistent shape.
 */

// === Base Response Types ===

export interface ApiSuccess<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface ApiError {
  error: {
    message: string;
    code?: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// === Project Types ===

export interface CreateProjectRequest {
  name: string;
  description?: string;
  framework?: "react" | "nextjs" | "vue" | "express" | "static-html";
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  framework: string | null;
  status: "active" | "archived" | "deleted";
  createdAt: string;
  updatedAt: string;
}

// === Session Types ===

export interface CreateSessionRequest {
  projectId: string;
  agentModel?: string;
}

export interface SessionResponse {
  id: string;
  projectId: string;
  status: "idle" | "running" | "paused" | "complete" | "error";
  agentModel: string | null;
  createdAt: string;
}

// === Message Types ===

export interface SendMessageRequest {
  content: string;
}

export interface MessageResponse {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
}

// === Checkpoint Types ===

export interface CheckpointResponse {
  id: string;
  sessionId: string;
  summary: string;
  gitSha: string | null;
  qaStatus: "pending" | "passed" | "failed" | "skipped";
  screenshotUrl: string | null;
  filesChanged: string[];
  confidence: number | null;
  suggestedNextSteps: string[];
  createdAt: string;
}

export interface AcceptCheckpointRequest {
  // Idempotency key sent via X-Idempotency-Key header
}

export interface ReviseCheckpointRequest {
  feedback: string;
}

export interface UndoCheckpointRequest {
  targetCheckpointId: string;
}

// === WebSocket Event Types ===

export type WSClientEvent =
  | { type: "send_message"; content: string }
  | { type: "checkpoint_accept"; checkpointId: string }
  | { type: "checkpoint_revise"; checkpointId: string; feedback: string }
  | { type: "checkpoint_undo"; checkpointId: string }
  | { type: "ping" };

export type WSServerEvent =
  | { type: "message"; data: MessageResponse }
  | { type: "checkpoint"; data: CheckpointResponse }
  | { type: "agent_status"; status: string; detail?: string }
  | { type: "qa_update"; checkpointId: string; status: string; report?: string }
  | { type: "error"; message: string; code?: string }
  | { type: "pong" };

// === Export Types ===

export interface ExportResponse {
  downloadUrl: string;
  expiresAt: string;
  sizeBytes: number;
}
