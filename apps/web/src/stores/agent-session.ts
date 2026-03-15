import { create } from "zustand";

export interface AgentMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  timestamp: string;
}

export interface Checkpoint {
  id: string;
  summary: string;
  screenshotUrl?: string;
  qaStatus: "pending" | "passed" | "failed";
  gitCommitSha: string;
  timestamp: string;
}

type SessionStatus = "idle" | "running" | "paused" | "complete" | "error";

interface AgentSessionState {
  sessionId: string | null;
  status: SessionStatus;
  messages: AgentMessage[];
  checkpoints: Checkpoint[];
  currentStep: string;
  setSessionId: (id: string | null) => void;
  setStatus: (status: SessionStatus) => void;
  addMessage: (msg: Omit<AgentMessage, "id" | "timestamp">) => void;
  addCheckpoint: (cp: Omit<Checkpoint, "id" | "timestamp">) => void;
  setCurrentStep: (step: string) => void;
  reset: () => void;
}

export const useAgentSessionStore = create<AgentSessionState>((set) => ({
  sessionId: null,
  status: "idle",
  messages: [],
  checkpoints: [],
  currentStep: "",
  setSessionId: (sessionId) => set({ sessionId }),
  setStatus: (status) => set({ status }),
  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...msg, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
      ],
    })),
  addCheckpoint: (cp) =>
    set((state) => ({
      checkpoints: [
        ...state.checkpoints,
        { ...cp, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
      ],
    })),
  setCurrentStep: (currentStep) => set({ currentStep }),
  reset: () =>
    set({ sessionId: null, status: "idle", messages: [], checkpoints: [], currentStep: "" }),
}));
