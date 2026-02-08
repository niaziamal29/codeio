import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Typography } from "#/ui/typography";
import { HookEvent } from "#/api/conversation-service/v1-conversation-service.types";
import { HookMatcherContent } from "./hook-matcher-content";
import { I18nKey } from "#/i18n/declaration";

interface HookEventItemProps {
  hookEvent: HookEvent;
  isExpanded: boolean;
  onToggle: (eventType: string) => void;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  pre_tool_use: "Pre Tool Use",
  post_tool_use: "Post Tool Use",
  user_prompt_submit: "User Prompt Submit",
  session_start: "Session Start",
  session_end: "Session End",
  stop: "Stop",
};

export function HookEventItem({
  hookEvent,
  isExpanded,
  onToggle,
}: HookEventItemProps) {
  const { t } = useTranslation();
  const eventTypeLabel =
    EVENT_TYPE_LABELS[hookEvent.event_type] || hookEvent.event_type;

  const totalHooks = hookEvent.matchers.reduce(
    (sum, matcher) => sum + matcher.hooks.length,
    0,
  );

  return (
    <div className="rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(hookEvent.event_type)}
        className="w-full py-3 px-2 text-left flex items-center justify-between hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center">
          <Typography.Text className="font-bold text-gray-100">
            {eventTypeLabel}
          </Typography.Text>
        </div>
        <div className="flex items-center">
          <Typography.Text className="px-2 py-1 text-xs rounded-full bg-gray-800 mr-2">
            {t(I18nKey.HOOKS_MODAL$HOOK_COUNT, { count: totalHooks })}
          </Typography.Text>
          <Typography.Text className="text-gray-300">
            {isExpanded ? (
              <ChevronDown size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </Typography.Text>
        </div>
      </button>

      {isExpanded && (
        <div className="px-2 pb-3 pt-1">
          {hookEvent.matchers.map((matcher, index) => (
            <HookMatcherContent
              key={`${hookEvent.event_type}-${matcher.matcher}-${index}`}
              matcher={matcher}
            />
          ))}
        </div>
      )}
    </div>
  );
}
