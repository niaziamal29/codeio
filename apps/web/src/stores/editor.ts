import { create } from "zustand";

interface EditorState {
  showPreview: boolean;
  previewUrl: string;
  togglePreview: () => void;
  setPreviewUrl: (url: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  showPreview: true,
  previewUrl: "about:blank",
  togglePreview: () => set((s) => ({ showPreview: !s.showPreview })),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
}));
