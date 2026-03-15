"use client";

import { useParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useUIModeStore } from "@/stores/ui-mode";
import { ModeToggle } from "@/components/shared/mode-toggle";
import { DescribeView } from "@/components/describe-mode/describe-view";
import { PowerView } from "@/components/power-mode/power-view";
import { ErrorBoundary } from "@/components/error-boundary";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const mode = useUIModeStore((s) => s.mode);

  return (
    <div className="flex flex-col h-screen">
      {/* Project Header */}
      <header className="h-16 border-b border-slate-800 px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-lg font-bold">
            Code<span className="text-brand-primary">io</span>
          </a>
          <span className="text-slate-600">|</span>
          <span className="text-sm text-slate-400 truncate max-w-[200px]">
            Project {projectId.slice(0, 8)}...
          </span>
        </div>

        <div className="flex items-center gap-4">
          <ModeToggle />
          <UserButton />
        </div>
      </header>

      {/* Mode Content */}
      <ErrorBoundary>
        <div className="flex-1 min-h-0">
          {mode === "describe" ? <DescribeView /> : <PowerView />}
        </div>
      </ErrorBoundary>
    </div>
  );
}
