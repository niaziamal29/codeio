"use client";

import { PromptInput } from "./prompt-input";
import { ProgressStream } from "./progress-stream";
import { CheckpointCard } from "./checkpoint-card";
import { useAgentSessionStore } from "@/stores/agent-session";

export function DescribeView() {
  const checkpoints = useAgentSessionStore((s) => s.checkpoints);

  const handleAccept = (id: string) => {
    console.log("Accept checkpoint:", id);
    // TODO: Resume agent from this checkpoint
  };

  const handleRevise = (id: string) => {
    console.log("Revise checkpoint:", id);
    // TODO: Open revision dialog
  };

  const handleUndo = (id: string) => {
    console.log("Undo checkpoint:", id);
    // TODO: Git reset to previous checkpoint
  };

  return (
    <div className="flex flex-col items-center py-12 px-6 min-h-[calc(100vh-64px)]">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold mb-2">What do you want to build?</h2>
        <p className="text-slate-400">
          Describe your app in plain English. Codeio will build it for you.
        </p>
      </div>

      <PromptInput />
      <ProgressStream />

      {checkpoints.length > 0 && (
        <div className="w-full max-w-2xl mt-8">
          <h3 className="text-lg font-semibold mb-4">Checkpoints</h3>
          <div className="space-y-4">
            {checkpoints.map((cp) => (
              <CheckpointCard
                key={cp.id}
                checkpoint={cp}
                onAccept={handleAccept}
                onRevise={handleRevise}
                onUndo={handleUndo}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
