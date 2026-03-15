"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjectsStore, type Project } from "@/stores/projects";
import Link from "next/link";

export function ProjectCard({ project }: { project: Project }) {
  const removeProject = useProjectsStore((s) => s.removeProject);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Card className="bg-brand-surface border-slate-700 p-5 hover:border-brand-primary transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link
            href={`/project/${project.id}`}
            className="text-lg font-semibold group-hover:text-brand-primary transition-colors"
          >
            {project.name}
          </Link>
          {project.description && (
            <p className="text-sm text-slate-400 mt-1">{project.description}</p>
          )}
        </div>
        <Badge variant="secondary" className="bg-slate-700 text-slate-300">
          {project.framework}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Updated {timeAgo(project.updatedAt)}</span>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/project/${project.id}`}>
            <Button variant="ghost" size="sm">
              Open
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            onClick={() => removeProject(project.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
