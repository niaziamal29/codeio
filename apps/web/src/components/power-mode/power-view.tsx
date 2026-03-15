"use client";

import { useState } from "react";
import { FileTree, type FileNode } from "./file-tree";
import { CodeEditor } from "./code-editor";
import { TerminalPanel } from "./terminal-panel";
import { ChatSidebar } from "./chat-sidebar";

// Placeholder file tree for development
const DEMO_FILES: FileNode[] = [
  {
    name: "src",
    path: "src",
    type: "directory",
    children: [
      {
        name: "app",
        path: "src/app",
        type: "directory",
        children: [
          { name: "page.tsx", path: "src/app/page.tsx", type: "file" },
          { name: "layout.tsx", path: "src/app/layout.tsx", type: "file" },
          { name: "globals.css", path: "src/app/globals.css", type: "file" },
        ],
      },
      {
        name: "components",
        path: "src/components",
        type: "directory",
        children: [
          { name: "hero.tsx", path: "src/components/hero.tsx", type: "file" },
        ],
      },
    ],
  },
  { name: "package.json", path: "package.json", type: "file" },
  { name: "tailwind.config.ts", path: "tailwind.config.ts", type: "file" },
];

const DEMO_CONTENT: Record<string, string> = {
  "src/app/page.tsx": `export default function Home() {\n  return (\n    <main className="flex min-h-screen flex-col items-center justify-center">\n      <h1>Hello, World!</h1>\n    </main>\n  );\n}`,
  "package.json": `{\n  "name": "my-app",\n  "version": "0.1.0"\n}`,
};

export function PowerView() {
  const [selectedFile, setSelectedFile] = useState<string | null>("src/app/page.tsx");
  const [fileContents, setFileContents] = useState<Record<string, string>>(DEMO_CONTENT);

  const content = selectedFile ? fileContents[selectedFile] ?? "// File not loaded" : "";

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* File Tree - 240px */}
      <div className="w-60 border-r border-slate-700 bg-brand-bg flex-shrink-0">
        <div className="px-3 py-2 border-b border-slate-700">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Explorer
          </span>
        </div>
        <FileTree files={DEMO_FILES} selectedPath={selectedFile} onSelect={setSelectedFile} />
      </div>

      {/* Main Editor + Terminal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        {selectedFile && (
          <div className="h-9 bg-brand-bg border-b border-slate-700 flex items-center px-3">
            <span className="text-xs text-slate-300 bg-brand-surface px-3 py-1 rounded-t border border-b-0 border-slate-700">
              {selectedFile.split("/").pop()}
            </span>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 min-h-0">
          {selectedFile ? (
            <CodeEditor
              value={content}
              filePath={selectedFile}
              onChange={(val) =>
                setFileContents((prev) => ({ ...prev, [selectedFile]: val }))
              }
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Select a file to edit
            </div>
          )}
        </div>

        {/* Terminal */}
        <div className="h-48 border-t border-slate-700 flex-shrink-0">
          <TerminalPanel />
        </div>
      </div>

      {/* Chat Sidebar - 320px */}
      <div className="w-80 flex-shrink-0">
        <ChatSidebar />
      </div>
    </div>
  );
}
