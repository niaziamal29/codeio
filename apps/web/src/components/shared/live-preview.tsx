"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type DeviceFrame = "desktop" | "tablet" | "mobile";

const FRAME_SIZES: Record<DeviceFrame, { width: string; label: string }> = {
  desktop: { width: "100%", label: "Desktop (100%)" },
  tablet: { width: "768px", label: "Tablet (768px)" },
  mobile: { width: "375px", label: "Mobile (375px)" },
};

interface LivePreviewProps {
  url: string;
  className?: string;
}

export function LivePreview({ url, className = "" }: LivePreviewProps) {
  const [device, setDevice] = useState<DeviceFrame>("desktop");
  const [refreshKey, setRefreshKey] = useState(0);
  const frame = FRAME_SIZES[device];

  return (
    <div className={`flex flex-col h-full bg-brand-bg ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-brand-surface">
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 mr-2">Preview</span>
          <TooltipProvider delayDuration={200}>
            {(Object.keys(FRAME_SIZES) as DeviceFrame[]).map((d) => (
              <Tooltip key={d}>
                <TooltipTrigger asChild>
                  <Button
                    variant={device === d ? "secondary" : "ghost"}
                    size="sm"
                    className={`h-7 px-2 text-xs ${
                      device === d ? "bg-brand-primary/20 text-brand-primary" : "text-slate-400"
                    }`}
                    onClick={() => setDevice(d)}
                  >
                    {d === "desktop" ? "[]" : d === "tablet" ? "|]" : "| "}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{FRAME_SIZES[d].label}</TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 truncate max-w-[200px]">{url}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400"
            onClick={() => window.open(url, "_blank")}
          >
            Open
          </Button>
        </div>
      </div>

      {/* Iframe Container */}
      <div className="flex-1 flex items-start justify-center overflow-auto p-4 bg-slate-950">
        <div
          className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
          style={{ width: frame.width, maxWidth: "100%", height: "100%" }}
        >
          <iframe
            key={refreshKey}
            src={url}
            className="w-full h-full border-0"
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
}
