import { CodeioParsedEvent } from ".";
import {
  UserMessageAction,
  AssistantMessageAction,
  CodeioAction,
  SystemMessageAction,
  CommandAction,
  FinishAction,
  TaskTrackingAction,
} from "./actions";
import {
  AgentStateChangeObservation,
  CommandObservation,
  ErrorObservation,
  MCPObservation,
  CodeioObservation,
  TaskTrackingObservation,
} from "./observations";
import { StatusUpdate } from "./variances";

export const isCodeioEvent = (
  event: unknown,
): event is CodeioParsedEvent =>
  typeof event === "object" &&
  event !== null &&
  "id" in event &&
  "source" in event &&
  "message" in event &&
  "timestamp" in event;

export const isCodeioAction = (
  event: CodeioParsedEvent,
): event is CodeioAction => "action" in event;

export const isCodeioObservation = (
  event: CodeioParsedEvent,
): event is CodeioObservation => "observation" in event;

export const isUserMessage = (
  event: CodeioParsedEvent,
): event is UserMessageAction =>
  isCodeioAction(event) &&
  event.source === "user" &&
  event.action === "message";

export const isAssistantMessage = (
  event: CodeioParsedEvent,
): event is AssistantMessageAction =>
  isCodeioAction(event) &&
  event.source === "agent" &&
  (event.action === "message" || event.action === "finish");

export const isErrorObservation = (
  event: CodeioParsedEvent,
): event is ErrorObservation =>
  isCodeioObservation(event) && event.observation === "error";

export const isCommandAction = (
  event: CodeioParsedEvent,
): event is CommandAction => isCodeioAction(event) && event.action === "run";

export const isAgentStateChangeObservation = (
  event: CodeioParsedEvent,
): event is AgentStateChangeObservation =>
  isCodeioObservation(event) && event.observation === "agent_state_changed";

export const isCommandObservation = (
  event: CodeioParsedEvent,
): event is CommandObservation =>
  isCodeioObservation(event) && event.observation === "run";

export const isFinishAction = (
  event: CodeioParsedEvent,
): event is FinishAction =>
  isCodeioAction(event) && event.action === "finish";

export const isSystemMessage = (
  event: CodeioParsedEvent,
): event is SystemMessageAction =>
  isCodeioAction(event) && event.action === "system";

export const isRejectObservation = (
  event: CodeioParsedEvent,
): event is CodeioObservation =>
  isCodeioObservation(event) && event.observation === "user_rejected";

export const isMcpObservation = (
  event: CodeioParsedEvent,
): event is MCPObservation =>
  isCodeioObservation(event) && event.observation === "mcp";

export const isTaskTrackingAction = (
  event: CodeioParsedEvent,
): event is TaskTrackingAction =>
  isCodeioAction(event) && event.action === "task_tracking";

export const isTaskTrackingObservation = (
  event: CodeioParsedEvent,
): event is TaskTrackingObservation =>
  isCodeioObservation(event) && event.observation === "task_tracking";

export const isStatusUpdate = (event: unknown): event is StatusUpdate =>
  typeof event === "object" &&
  event !== null &&
  "status_update" in event &&
  "type" in event &&
  "id" in event;

export const isActionOrObservation = (
  event: CodeioParsedEvent,
): event is CodeioAction | CodeioObservation =>
  isCodeioAction(event) || isCodeioObservation(event);
