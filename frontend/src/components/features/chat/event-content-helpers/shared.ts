import { CodeioAction } from "#/types/core/actions";
import { CodeioObservation } from "#/types/core/observations";

export const MAX_CONTENT_LENGTH = 1000;

export const getDefaultEventContent = (
  event: CodeioAction | CodeioObservation,
): string => `\`\`\`json\n${JSON.stringify(event, null, 2)}\n\`\`\``;
