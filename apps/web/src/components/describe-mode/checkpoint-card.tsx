"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Checkpoint } from "@/stores/agent-session";

interface CheckpointCardProps {
  checkpoint: Checkpoint;
  onAccept: (id: string) => void;
  onRevise: (id: string) => void;
  onUndo: (id: string) => void;
}

export function CheckpointCard({ checkpoint, onAccept, onRevise, onUndo }: CheckpointCardProps) {
  const statusColor = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    passed: "bg-green-500/20 text-green-400 border-green-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
  }[checkpoint.qaStatus];

  return (
    <Card className="bg-brand-surface border-slate-700 overflow-hidden">
      {/* Screenshot preview */}
      {checkpoint.screenshotUrl ? (
        <img
          src={checkpoint.screenshotUrl}
          alt="Checkpoint preview"
          className="w-full h-48 object-cover object-top border-b border-slate-700"
        />
      ) : (
        <div className="w-full h-48 bg-slate-800 flex items-center justify-center border-b border-slate-700">
          <span className="text-slate-500 text-sm">Preview loading...</span>
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-slate-200">{checkpoint.summary}</p>
          <Badge className={`ml-2 text-xs ${statusColor}`}>
            QA: {checkpoint.qaStatus}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => onAccept(checkpoint.id)}
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Accept
          </Button>
          <Button
            onClick={() => onRevise(checkpoint.id)}
            size="sm"
            variant="outline"
            className="flex-1 border-slate-600 hover:bg-slate-800"
          >
            Revise
          </Button>
          <Button
            onClick={() => onUndo(checkpoint.id)}
            size="sm"
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-950"
          >
            Undo
          </Button>
        </div>
      </div>
    </Card>
  );
}
