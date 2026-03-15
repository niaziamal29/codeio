"use client";

import { useEffect, useRef } from "react";

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<ReturnType<typeof Object> | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function init() {
      if (!containerRef.current || termRef.current) return;

      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      // Load xterm CSS dynamically
      if (!document.getElementById("xterm-css")) {
        const link = document.createElement("link");
        link.id = "xterm-css";
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/@xterm/xterm@6/css/xterm.min.css";
        document.head.appendChild(link);
      }

      const term = new Terminal({
        theme: {
          background: "#0f172a",
          foreground: "#e2e8f0",
          cursor: "#6366f1",
          selectionBackground: "#6366f144",
        },
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 13,
        cursorBlink: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();
      termRef.current = term;

      term.writeln("\x1b[36mCodeio Terminal\x1b[0m");
      term.writeln("Connected to project sandbox.");
      term.writeln("");
      term.write("$ ");

      // TODO: Connect to actual sandbox terminal via WebSocket in Phase 3
      term.onData((data: string) => {
        term.write(data);
      });

      const observer = new ResizeObserver(() => fitAddon.fit());
      observer.observe(containerRef.current);

      cleanup = () => {
        observer.disconnect();
        term.dispose();
        termRef.current = null;
      };
    }

    init();
    return () => cleanup?.();
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
