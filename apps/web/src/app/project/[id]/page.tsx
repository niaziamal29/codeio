"use client";

import { useUIModeStore } from "@/stores/ui-mode";
import { DescribeView } from "@/components/describe-mode/describe-view";
import { PowerView } from "@/components/power-mode/power-view";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/error-boundary";
import Link from "next/link";

export default function ProjectPage() {
  const { mode, toggleMode } = useUIModeStore();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Project Header */}
      <header className="border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-200">
            &larr; Dashboard
          </Link>
          <h1 className="text-lg font-semibold">
            Code<span className="text-brand-primary">io</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={mode === "describe" ? "default" : "ghost"}
            size="sm"
            onClick={() => toggleMode()}
            className={mode === "describe" ? "bg-brand-primary" : ""}
          >
            Describe
          </Button>
          <Button
            variant={mode === "power" ? "default" : "ghost"}
            size="sm"
            onClick={() => toggleMode()}
            className={mode === "power" ? "bg-brand-primary" : ""}
          >
            Power
          </Button>
        </div>
      </header>

      {/* Content */}
      <ErrorBoundary>
        {mode === "describe" ? (
          <DescribeView />
        ) : (
          <PowerView />
        )}
      </ErrorBoundary>
    </div>
  );
}
