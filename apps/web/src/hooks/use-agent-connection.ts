"use client";

import { useEffect, useRef, useCallback } from "react";
import { AgentSocket, type AgentEvent } from "@/lib/agent-socket";
import { useAgentSessionStore } from "@/stores/agent-session";

export function useAgentConnection(sessionId: string | null) {
  const socketRef = useRef<AgentSocket | null>(null);
  const { setStatus, addMessage, addCheckpoint, setCurrentStep } = useAgentSessionStore();

  const handleEvent = useCallback(
    (event: AgentEvent) => {
      switch (event.type) {
        case "status":
          setStatus(event.status);
          break;
        case "step":
          setCurrentStep(event.description);
          break;
        case "message":
          addMessage({ role: event.role, content: event.content });
          break;
        case "checkpoint":
          addCheckpoint(event.data);
          setStatus("paused");
          break;
        case "error":
          addMessage({ role: "system", content: `Error: ${event.message}` });
          setStatus("error");
          break;
      }
    },
    [setStatus, addMessage, addCheckpoint, setCurrentStep],
  );

  useEffect(() => {
    if (!sessionId) return;

    const socket = new AgentSocket(sessionId);
    socketRef.current = socket;
    socket.onEvent(handleEvent);
    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, handleEvent]);

  const sendMessage = useCallback((message: string) => {
    socketRef.current?.send({ type: "user_message", content: message });
  }, []);

  return { sendMessage };
}
