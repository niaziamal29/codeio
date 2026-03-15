import { create } from "zustand";

export type UIMode = "describe" | "power";

interface UIModeState {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  toggleMode: () => void;
}

export const useUIModeStore = create<UIModeState>((set) => ({
  mode: "describe",
  setMode: (mode) => set({ mode }),
  toggleMode: () =>
    set((state) => ({ mode: state.mode === "describe" ? "power" : "describe" })),
}));
