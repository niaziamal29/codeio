import { AgentState } from "../agent-state";
import { CodeioObservationEvent } from "./base";

export interface AgentStateChangeObservation extends CodeioObservationEvent<"agent_state_changed"> {
  source: "agent";
  extras: {
    agent_state: AgentState;
    reason?: string;
  };
}

export interface CommandObservation extends CodeioObservationEvent<"run"> {
  source: "agent" | "user";
  extras: {
    command: string;
    hidden?: boolean;
    metadata: Record<string, unknown>;
  };
}

export interface IPythonObservation extends CodeioObservationEvent<"run_ipython"> {
  source: "agent";
  extras: {
    code: string;
    image_urls?: string[];
  };
}

export interface DelegateObservation extends CodeioObservationEvent<"delegate"> {
  source: "agent";
  extras: {
    outputs: Record<string, unknown>;
  };
}

export interface BrowseObservation extends CodeioObservationEvent<"browse"> {
  source: "agent";
  extras: {
    url: string;
    screenshot: string;
    error: boolean;
    open_page_urls: string[];
    active_page_index: number;
    dom_object: Record<string, unknown>;
    axtree_object: Record<string, unknown>;
    extra_element_properties: Record<string, unknown>;
    last_browser_action: string;
    last_browser_action_error: unknown;
    focused_element_bid: string;
  };
}

export interface BrowseInteractiveObservation extends CodeioObservationEvent<"browse_interactive"> {
  source: "agent";
  extras: {
    url: string;
    screenshot: string;
    error: boolean;
    open_page_urls: string[];
    active_page_index: number;
    dom_object: Record<string, unknown>;
    axtree_object: Record<string, unknown>;
    extra_element_properties: Record<string, unknown>;
    last_browser_action: string;
    last_browser_action_error: unknown;
    focused_element_bid: string;
  };
}

export interface WriteObservation extends CodeioObservationEvent<"write"> {
  source: "agent";
  extras: {
    path: string;
    content: string;
  };
}

export interface ReadObservation extends CodeioObservationEvent<"read"> {
  source: "agent";
  extras: {
    path: string;
    impl_source: string;
  };
}

export interface EditObservation extends CodeioObservationEvent<"edit"> {
  source: "agent";
  extras: {
    path: string;
    diff: string;
    impl_source: string;
  };
}

export interface ErrorObservation extends CodeioObservationEvent<"error"> {
  source: "user";
  extras: {
    error_id?: string;
  };
}

export interface AgentThinkObservation extends CodeioObservationEvent<"think"> {
  source: "agent";
  extras: {
    thought: string;
  };
}

export interface MicroagentKnowledge {
  name: string;
  trigger: string;
  content: string;
}

export interface RecallObservation extends CodeioObservationEvent<"recall"> {
  source: "agent";
  extras: {
    recall_type?: "workspace_context" | "knowledge";
    repo_name?: string;
    repo_directory?: string;
    repo_instructions?: string;
    runtime_hosts?: Record<string, number>;
    custom_secrets_descriptions?: Record<string, string>;
    additional_agent_instructions?: string;
    conversation_instructions?: string;
    date?: string;
    microagent_knowledge?: MicroagentKnowledge[];
  };
}

export interface MCPObservation extends CodeioObservationEvent<"mcp"> {
  source: "agent";
  extras: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface UserRejectedObservation extends CodeioObservationEvent<"user_rejected"> {
  source: "agent";
  extras: Record<string, unknown>;
}

export interface TaskTrackingObservation extends CodeioObservationEvent<"task_tracking"> {
  source: "agent";
  extras: {
    command: string;
    task_list: Array<{
      id: string;
      title: string;
      status: "todo" | "in_progress" | "done";
      notes?: string;
    }>;
  };
}

export type CodeioObservation =
  | AgentStateChangeObservation
  | AgentThinkObservation
  | CommandObservation
  | IPythonObservation
  | DelegateObservation
  | BrowseObservation
  | BrowseInteractiveObservation
  | WriteObservation
  | ReadObservation
  | EditObservation
  | ErrorObservation
  | RecallObservation
  | MCPObservation
  | UserRejectedObservation
  | TaskTrackingObservation;
