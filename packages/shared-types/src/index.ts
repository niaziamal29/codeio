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
