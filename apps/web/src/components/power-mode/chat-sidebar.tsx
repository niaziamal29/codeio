"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgentSessionStore } from "@/stores/agent-session";

export function ChatSidebar() {
  const [input, setInput] = useState("");
  const { messages, addMessage, status } = useAgentSessionStore();

  const handleSend = () => {
    if (!input.trim()) return;
    addMessage({ role: "user", content: input.trim() });
    setInput("");
    // TODO: Send to agent via WebSocket
  };

  return (
    <div className="flex flex-col h-full bg-brand-surface border-l border-slate-700">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold">Agent Chat</h3>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-sm rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-brand-primary/20 text-brand-text ml-4"
                  : msg.role === "agent"
                    ? "bg-slate-800 text-slate-300 mr-4"
                    : "bg-yellow-500/10 text-yellow-400 text-xs"
              }`}
            >
              {msg.content}
            </div>
          ))}
          {status === "running" && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse" />
              Agent is working...
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-slate-700 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask the agent..."
          className="bg-brand-bg border-slate-600 text-sm"
        />
        <Button onClick={handleSend} size="sm" className="bg-brand-primary hover:bg-brand-primary-hover">
          Send
        </Button>
      </div>
    </div>
  );
}
