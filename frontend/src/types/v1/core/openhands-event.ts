// Import all event types
import {
  ActionEvent,
  MessageEvent,
  ObservationEvent,
  UserRejectObservation,
  AgentErrorEvent,
  SystemPromptEvent,
  CondensationEvent,
  CondensationRequestEvent,
  CondensationSummaryEvent,
  ConversationStateUpdateEvent,
  ConversationErrorEvent,
  PauseEvent,
} from "./events/index";

/**
 * Union type representing all possible Codeio events.
 * This includes all main event types that can occur in the system.
 */
export type CodeioEvent =
  // Core action and observation events
  | ActionEvent
  | MessageEvent
  | ObservationEvent
  | UserRejectObservation
  | AgentErrorEvent
  | SystemPromptEvent
  // Conversation management events
  | CondensationEvent
  | CondensationRequestEvent
  | CondensationSummaryEvent
  | ConversationStateUpdateEvent
  | ConversationErrorEvent
  // Control events
  | PauseEvent;
