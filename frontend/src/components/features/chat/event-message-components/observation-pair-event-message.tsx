import React from "react";
import { CodeioAction } from "#/types/core/actions";
import { isCodeioAction } from "#/types/core/guards";
import { ChatMessage } from "../chat-message";
import { MicroagentStatusWrapper } from "./microagent-status-wrapper";
import { MicroagentStatus } from "#/types/microagent-status";

const hasThoughtProperty = (
  obj: Record<string, unknown>,
): obj is { thought: string } => "thought" in obj && !!obj.thought;

interface ObservationPairEventMessageProps {
  event: CodeioAction;
  microagentStatus?: MicroagentStatus | null;
  microagentConversationId?: string;
  microagentPRUrl?: string;
  actions?: Array<{
    icon: React.ReactNode;
    onClick: () => void;
    tooltip?: string;
  }>;
}

export function ObservationPairEventMessage({
  event,
  microagentStatus,
  microagentConversationId,
  microagentPRUrl,
  actions,
}: ObservationPairEventMessageProps) {
  if (!isCodeioAction(event)) {
    return null;
  }

  if (hasThoughtProperty(event.args) && event.action !== "think") {
    return (
      <div>
        <ChatMessage
          type="agent"
          message={event.args.thought}
          actions={actions}
        />
        <MicroagentStatusWrapper
          microagentStatus={microagentStatus}
          microagentConversationId={microagentConversationId}
          microagentPRUrl={microagentPRUrl}
          actions={actions}
        />
      </div>
    );
  }

  return (
    <MicroagentStatusWrapper
      microagentStatus={microagentStatus}
      microagentConversationId={microagentConversationId}
      microagentPRUrl={microagentPRUrl}
      actions={actions}
    />
  );
}
