import { CodeioAction } from "./actions";
import { CodeioObservation } from "./observations";
import { CodeioVariance } from "./variances";

/**
 * @deprecated Will be removed once we fully transition to v1 events
 */
export type CodeioParsedEvent =
  | CodeioAction
  | CodeioObservation
  | CodeioVariance;
