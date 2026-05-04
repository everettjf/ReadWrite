import { useEffect, useRef, useState } from 'react';
import type { CodeTab, FileTreeEntry } from '@shared/types';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { cn, extname } from '@/lib/utils';
import { useTabsStore } from '@/stores/tabs';
import { useReaderSelectionStore } from '@/stores/reader-selection';

const LANG_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.json': 'json',
  '.md': 'markdown',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'cpp',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.sh': 'shell',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.xml': 'xml',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sql': 'sql',
};

interface CodeReaderProps {
  tab: CodeTab;
}

export function CodeReader({ tab }: CodeReaderProps): JSX.Element {
  const [tree, setTree] = useState<FileTreeEntry[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(tab.activeFile ?? null);
  const [content, setContent] = useState('');
  const updateTab = useTabsStore((s) => s.updateTab);
  const setReaderSelection = useReaderSelectionStore((s) => s.set);
  const clearReaderSelection = useReaderSelectionStore((s) => s.clear);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  // When the reader unmounts (tab closed / switched), drop any pending
  // selection so the toolbar doesn't linger over the next reader.
  useEffect(() => {
    return () => clearReaderSelection();
  }, [clearReaderSelection]);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    const update = (): void => {
      const sel = editor.getSelection();
      const model = editor.getModel();
      if (!sel || !model || sel.isEmpty()) {
        clearReaderSelection();
        return;
      }
      const text = model.getValueInRange(sel);
      if (!text.trim()) {
        clearReaderSelection();
        return;
      }
      const startVisible = editor.getScrolledVisiblePosition(sel.getStartPosition());
      const endVisible = editor.getScrolledVisiblePosition(sel.getEndPosition());
      if (!startVisible) return;
      const node = editor.getDomNode();
      if (!node) return;
      const editorRect = node.getBoundingClientRect();
      // Center horizontally between start and end of the selection (works
      // well for single-line; for multi-line we still anchor near the
      // first line which is fine for an above-selection toolbar).
      const left =
        editorRect.left + (startVisible.left + (endVisible?.left ?? startVisible.left)) / 2;
      setReaderSelection({
        text,
        source: 'code',
        rect: {
          top: editorRect.top + startVisible.top,
          left,
          width: 0,
          height: startVisible.height,
        },
      });
    };
    editor.onDidChangeCursorSelection(() => update());
    editor.onDidScrollChange(() => update());
  };

  useEffect(() => {
    window.api.fs
      .listDir(tab.rootPath)
      .then(setTree)
      .catch(() => null);
    window.api.fs.watchDir(tab.rootPath).catch(() => null);
    const off = window.api.fs.onWatchEvent((evt) => {
      if (evt.root === tab.rootPath) {
        window.api.fs
          .listDir(tab.rootPath)
          .then(setTree)
          .catch(() => null);
      }
    });
    return () => {
      off();
      window.api.fs.unwatchDir(tab.rootPath).catch(() => null);
    };
  }, [tab.rootPath]);

  useEffect(() => {
    if (!activeFile) return;
    window.api.fs
      .readFile(activeFile)
      .then(setContent)
      .catch(() => setContent(''));
    updateTab(tab.id, { activeFile } as Partial<CodeTab>);
  }, [activeFile, tab.id, updateTab]);

  const language = activeFile ? (LANG_MAP[extname(activeFile)] ?? 'plaintext') : 'plaintext';

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
        <span className="truncate text-xs text-muted-foreground">{tab.rootPath}</span>
        <div className="flex-1" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-1">
          <FileTree entries={tree} onOpen={setActiveFile} activeFile={activeFile} />
        </div>
        <div className="flex-1">
          {activeFile ? (
            <Editor
              height="100%"
              value={content}
              language={language}
              theme="vs-dark"
              onMount={handleMount}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a file from the tree
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FileTreeProps {
  entries: FileTreeEntry[];
  onOpen: (path: string) => void;
  activeFile: string | null;
  depth?: number;
}

function FileTree({ entries, onOpen, activeFile, depth = 0 }: FileTreeProps): JSX.Element {
  return (
    <ul className="text-sm">
      {entries.map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          onOpen={onOpen}
          activeFile={activeFile}
          depth={depth}
        />
      ))}
    </ul>
  );
}

function FileTreeNode({
  entry,
  onOpen,
  activeFile,
  depth,
}: {
  entry: FileTreeEntry;
  onOpen: (path: string) => void;
  activeFile: string | null;
  depth: number;
}): JSX.Element {
  const [open, setOpen] = useState(depth < 1);
  const isDir = entry.isDirectory;

  return (
    <li>
      <button
        onClick={() => (isDir ? setOpen((v) => !v) : onOpen(entry.path))}
        className={cn(
          'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-accent',
          entry.path === activeFile && 'bg-accent',
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {isDir ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        {isDir ? (
          <Folder className="h-3.5 w-3.5 shrink-0 text-blue-500" />
        ) : (
          <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{entry.name}</span>
      </button>
      {isDir && open && entry.children && entry.children.length > 0 && (
        <FileTree
          entries={entry.children}
          onOpen={onOpen}
          activeFile={activeFile}
          depth={depth + 1}
        />
      )}
    </li>
  );
}
