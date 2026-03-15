export type ProjectId = string;
export type SessionId = string;

export interface Project {
  id: ProjectId;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export type UIMode = "describe" | "power";

export interface CheckpointEvent {
  id: string;
  sessionId: SessionId;
  projectId: ProjectId;
  timestamp: string;
  summary: string;
  screenshotUrl?: string;
  qaStatus: "pending" | "passed" | "failed";
  gitCommitSha: string;
}

export type CheckpointDecision = "accept" | "revise" | "undo" | "continue";

export interface CheckpointAction {
  type: "checkpoint";
  summary: string;
  filesChanged: string[];
  screenshotPath?: string;
  suggestedNextSteps: string[];
  confidence: number;
}

export interface CheckpointResponse {
  decision: CheckpointDecision;
  feedback?: string;
  checkpointId: string;
}
