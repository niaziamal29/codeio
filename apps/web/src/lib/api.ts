/**
 * API client for Codeio backend.
 *
 * Uses environment variable for API URL to avoid hardcoded localhost.
 * All IDs are server-generated (UUIDv7) — client never creates database IDs.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export function createProjectSession(projectId: string) {
  return apiFetch("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ projectId }),
  });
}

export function sendUserMessage(sessionId: string, message: string) {
  return apiFetch(`/api/sessions/${sessionId}/message`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function acceptCheckpoint(sessionId: string, checkpointId: string, idempotencyKey: string) {
  return apiFetch(`/api/sessions/${sessionId}/checkpoints/${checkpointId}/accept`, {
    method: "POST",
    headers: { "X-Idempotency-Key": idempotencyKey },
  });
}

export function reviseCheckpoint(sessionId: string, checkpointId: string, feedback: string, idempotencyKey: string) {
  return apiFetch(`/api/sessions/${sessionId}/checkpoints/${checkpointId}/revise`, {
    method: "POST",
    headers: { "X-Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ feedback }),
  });
}

export function undoCheckpoint(sessionId: string, checkpointId: string, idempotencyKey: string) {
  return apiFetch(`/api/sessions/${sessionId}/checkpoints/${checkpointId}/undo`, {
    method: "POST",
    headers: { "X-Idempotency-Key": idempotencyKey },
  });
}
