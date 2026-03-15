"use client";

import { useUIModeStore } from "@/stores/ui-mode";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ModeToggle() {
  const { mode, toggleMode } = useUIModeStore();

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex bg-brand-bg rounded-lg p-0.5 border border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-3 text-xs rounded-md transition-colors ${
                mode === "describe"
                  ? "bg-brand-primary text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => mode !== "describe" && toggleMode()}
            >
              Describe
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-3 text-xs rounded-md transition-colors ${
                mode === "power"
                  ? "bg-brand-primary text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => mode !== "power" && toggleMode()}
            >
              Power
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {mode === "describe"
            ? "Switch to Power Mode for full code access"
            : "Switch to Describe Mode for guided building"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
