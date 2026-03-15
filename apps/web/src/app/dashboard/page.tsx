"use client";

import { UserButton } from "@clerk/nextjs";
import { useProjectsStore } from "@/stores/projects";
import { ProjectCard } from "@/components/project-card";
import { NewProjectDialog } from "@/components/new-project-dialog";

export default function DashboardPage() {
  const projects = useProjectsStore((s) => s.projects);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">
            Code<span className="text-brand-primary">io</span>
          </h1>
          <div className="flex items-center gap-4">
            <NewProjectDialog />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-semibold mb-6">Your Projects</h2>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg mb-4">
              No projects yet. Create your first one!
            </p>
            <NewProjectDialog />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
