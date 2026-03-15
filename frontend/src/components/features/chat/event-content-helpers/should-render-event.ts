import { CodeioAction } from "#/types/core/actions";
import { CodeioEventType } from "#/types/core/base";
import {
  isCommandAction,
  isCommandObservation,
  isCodeioAction,
  isCodeioObservation,
} from "#/types/core/guards";
import { CodeioObservation } from "#/types/core/observations";

const COMMON_NO_RENDER_LIST: CodeioEventType[] = [
  "system",
  "agent_state_changed",
  "change_agent_state",
];

const ACTION_NO_RENDER_LIST: CodeioEventType[] = ["recall"];

const OBSERVATION_NO_RENDER_LIST: CodeioEventType[] = ["think"];

export const shouldRenderEvent = (
  event: CodeioAction | CodeioObservation,
) => {
  if (isCodeioAction(event)) {
    if (isCommandAction(event) && event.source === "user") {
      // For user commands, we always hide them from the chat interface
      return false;
    }

    const noRenderList = COMMON_NO_RENDER_LIST.concat(ACTION_NO_RENDER_LIST);
    return !noRenderList.includes(event.action);
  }

  if (isCodeioObservation(event)) {
    if (isCommandObservation(event) && event.source === "user") {
      // For user commands, we always hide them from the chat interface
      return false;
    }

    const noRenderList = COMMON_NO_RENDER_LIST.concat(
      OBSERVATION_NO_RENDER_LIST,
    );
    return !noRenderList.includes(event.observation);
  }

  return true;
};

export const hasUserEvent = (
  events: (CodeioAction | CodeioObservation)[],
) =>
  events.some((event) => isCodeioAction(event) && event.source === "user");
