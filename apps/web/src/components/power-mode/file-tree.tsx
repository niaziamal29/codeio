"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface FileTreeProps {
  files: FileNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function FileTreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isSelected = node.path === selectedPath;

  const icon = node.type === "directory" ? (expanded ? "v " : "> ") : "  ";
  const fileIcon = node.type === "file" ? getFileIcon(node.name) : "";

  return (
    <div>
      <button
        onClick={() => {
          if (node.type === "directory") setExpanded(!expanded);
          else onSelect(node.path);
        }}
        className={`w-full text-left px-2 py-1 text-sm hover:bg-slate-800 rounded flex items-center ${
          isSelected ? "bg-brand-primary/20 text-brand-primary" : "text-slate-300"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="text-slate-500 font-mono text-xs mr-1">{icon}</span>
        <span className="mr-1">{fileIcon}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {node.type === "directory" && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getFileIcon(name: string): string {
  if (name.endsWith(".tsx") || name.endsWith(".ts")) return "TS";
  if (name.endsWith(".jsx") || name.endsWith(".js")) return "JS";
  if (name.endsWith(".css")) return "CS";
  if (name.endsWith(".json")) return "{}";
  if (name.endsWith(".py")) return "PY";
  if (name.endsWith(".md")) return "MD";
  return "  ";
}

export function FileTree({ files, selectedPath, onSelect }: FileTreeProps) {
  return (
    <ScrollArea className="h-full">
      <div className="py-2">
        {files.map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            depth={0}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
