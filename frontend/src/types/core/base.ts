export type CodeioEventType =
  | "message"
  | "system"
  | "agent_state_changed"
  | "change_agent_state"
  | "run"
  | "read"
  | "write"
  | "edit"
  | "run_ipython"
  | "delegate"
  | "browse"
  | "browse_interactive"
  | "reject"
  | "think"
  | "finish"
  | "error"
  | "recall"
  | "mcp"
  | "call_tool_mcp"
  | "task_tracking"
  | "user_rejected";

export type CodeioSourceType = "agent" | "user" | "environment";

interface CodeioBaseEvent {
  id: number;
  source: CodeioSourceType;
  message: string;
  timestamp: string; // ISO 8601
}

export interface CodeioActionEvent<
  T extends CodeioEventType,
> extends CodeioBaseEvent {
  action: T;
  args: Record<string, unknown>;
}

export interface CodeioObservationEvent<
  T extends CodeioEventType,
> extends CodeioBaseEvent {
  cause: number;
  observation: T;
  content: string;
  extras: Record<string, unknown>;
}
