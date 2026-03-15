"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAgentSessionStore } from "@/stores/agent-session";

export function PromptInput() {
  const [prompt, setPrompt] = useState("");
  const { status, addMessage, setStatus, setCurrentStep } = useAgentSessionStore();
  const isRunning = status === "running";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isRunning) return;

    addMessage({ role: "user", content: prompt.trim() });
    setStatus("running");
    setCurrentStep("Understanding your request...");

    // TODO: Connect to actual WebSocket in Phase 3
    // For now, simulate agent progress
    setTimeout(() => setCurrentStep("Setting up project structure..."), 1500);
    setTimeout(() => setCurrentStep("Writing components..."), 3000);
    setTimeout(() => {
      setCurrentStep("Running QA checks...");
      setStatus("paused");
    }, 5000);

    setPrompt("");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to build... e.g., 'A landing page for a SaaS product with a hero section, pricing cards, and a contact form'"
          className="w-full min-h-[120px] p-4 pr-24 bg-brand-surface border border-slate-700 rounded-xl text-brand-text placeholder:text-slate-500 focus:outline-none focus:border-brand-primary resize-none"
          disabled={isRunning}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e);
          }}
        />
        <Button
          type="submit"
          disabled={!prompt.trim() || isRunning}
          className="absolute bottom-3 right-3 bg-brand-primary hover:bg-brand-primary-hover"
        >
          {isRunning ? "Building..." : "Build It"}
        </Button>
      </div>
      <p className="text-xs text-slate-500 mt-2 text-center">
        Press Cmd+Enter to submit
      </p>
    </form>
  );
}
