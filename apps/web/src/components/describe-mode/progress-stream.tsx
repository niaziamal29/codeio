"use client";

import { useAgentSessionStore } from "@/stores/agent-session";

export function ProgressStream() {
  const { status, currentStep, messages } = useAgentSessionStore();

  if (status === "idle" && messages.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 space-y-3">
      {messages
        .filter((m) => m.role === "user")
        .map((msg) => (
          <div key={msg.id} className="bg-brand-surface rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-500 mb-1">You asked:</p>
            <p className="text-sm text-slate-300">{msg.content}</p>
          </div>
        ))}

      {status === "running" && currentStep && (
        <div className="flex items-center gap-3 p-4 bg-brand-surface rounded-lg border border-brand-primary/30">
          <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
          <span className="text-sm text-slate-300">{currentStep}</span>
        </div>
      )}
    </div>
  );
}
