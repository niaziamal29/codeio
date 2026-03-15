import { CodeioObservation } from "./types/core/observations";
import { CodeioAction } from "./types/core/actions";

export type Message = {
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
  imageUrls?: string[];
  type?: "thought" | "error" | "action";
  success?: boolean;
  pending?: boolean;
  translationID?: string;
  eventID?: number;
  observation?: { payload: CodeioObservation };
  action?: { payload: CodeioAction };
};
