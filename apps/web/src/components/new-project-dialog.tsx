"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjectsStore } from "@/stores/projects";

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const addProject = useProjectsStore((s) => s.addProject);

  const handleCreate = () => {
    if (!name.trim()) return;
    addProject({ name: name.trim(), description: description.trim(), framework: "nextjs" });
    setName("");
    setDescription("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-primary hover:bg-brand-primary-hover">
          + New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-brand-surface border-slate-700">
        <DialogHeader>
          <DialogTitle>Create a New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome App"
              className="bg-brand-bg border-slate-600"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description (optional)</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A landing page for..."
              className="bg-brand-bg border-slate-600"
            />
          </div>
          <Button onClick={handleCreate} className="w-full bg-brand-primary hover:bg-brand-primary-hover">
            Create Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
