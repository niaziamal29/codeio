import { create } from "zustand";

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  framework: "nextjs" | "vite-react" | "html" | "other";
}

interface ProjectsState {
  projects: Project[];
  isLoading: boolean;
  addProject: (project: Omit<Project, "id" | "createdAt" | "updatedAt">) => void;
  removeProject: (id: string) => void;
  setProjects: (projects: Project[]) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Projects store.
 *
 * Note: addProject uses crypto.randomUUID() for local-only
 * optimistic UI. Server-side ID generation (UUIDv7) will
 * replace this when API integration is added in Phase 3.
 */
export const useProjectsStore = create<ProjectsState>((set) => ({
  projects: [],
  isLoading: false,
  addProject: (partial) =>
    set((state) => ({
      projects: [
        {
          ...partial,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...state.projects,
      ],
    })),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    })),
  setProjects: (projects) => set({ projects }),
  setLoading: (isLoading) => set({ isLoading }),
}));
