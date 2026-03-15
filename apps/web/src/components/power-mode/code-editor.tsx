"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

interface CodeEditorProps {
  value: string;
  filePath: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

function getLanguageExtension(filePath: string) {
  if (/\.tsx?$/.test(filePath)) return javascript({ typescript: true, jsx: true });
  if (/\.jsx?$/.test(filePath)) return javascript({ jsx: true });
  if (/\.html?$/.test(filePath)) return html();
  if (/\.css$/.test(filePath)) return css();
  if (/\.json$/.test(filePath)) return json();
  if (/\.py$/.test(filePath)) return python();
  return javascript();
}

export function CodeEditor({ value, filePath, onChange, readOnly = false }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        getLanguageExtension(filePath),
        oneDark,
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
        }),
        ...(readOnly ? [EditorState.readOnly.of(true)] : []),
        ...(onChange
          ? [
              EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                  onChange(update.state.doc.toString());
                }
              }),
            ]
          : []),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
}
