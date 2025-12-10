"use client";

import React, {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  FileText,
  CheckCircle,
  Circle,
  Clock,
  ChevronDown,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TodoItem, FileItem } from "@/app/types/types";
import { useChatContext } from "@/providers/ChatProvider";
import { cn } from "@/lib/utils";
import { FileViewDialog } from "@/app/components/FileViewDialog";
import { FileUploadButton } from "@/app/components/FileUploadButton";

export function FilesPopover({
  files,
  setFiles,
  groundingFiles,
  setGroundingFiles,
  editDisabled,
}: {
  files: Record<string, any>;
  setFiles: (files: Record<string, any>) => Promise<void>;
  groundingFiles: string[];
  setGroundingFiles: (files: string[]) => Promise<void>;
  editDisabled: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const handleSaveFile = useCallback(
    async (fileName: string, content: string) => {
      await setFiles({ ...files, [fileName]: content });
      setSelectedFile({ path: fileName, content: content });
    },
    [files, setFiles]
  );

  const handleUploaded = useCallback(
    async (fileName: string) => {
      const next = Array.from(new Set([...groundingFiles, fileName]));
      await setGroundingFiles(next);
    },
    [groundingFiles, setGroundingFiles]
  );

  const toggleGrounding = useCallback(
    async (fileName: string) => {
      if (editDisabled) return;
      const isSelected = groundingFiles.includes(fileName);
      const next = isSelected
        ? groundingFiles.filter((f) => f !== fileName)
        : [...groundingFiles, fileName];
      await setGroundingFiles(next);
    },
    [editDisabled, groundingFiles, setGroundingFiles]
  );

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Upload text/markdown/CSV/JSON files and select them for grounding.
        </p>
        <FileUploadButton
          onUploaded={handleUploaded}
          setFiles={setFiles}
          files={files}
          accept=".txt,.md,.markdown,.json,.csv"
          disabled={editDisabled}
        />
      </div>

      {Object.keys(files).length === 0 ? (
        <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            No files yet. Upload one to start grounding answers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(256px,1fr))] gap-2">
          {Object.keys(files).map((file) => {
            const filePath = String(file);
            const rawContent = files[file];
            let fileContent: string;
            if (
              typeof rawContent === "object" &&
              rawContent !== null &&
              "content" in rawContent
            ) {
              const contentArray = (rawContent as { content: unknown }).content;
              if (Array.isArray(contentArray)) {
                fileContent = contentArray.join("\n");
              } else {
                fileContent = String(contentArray || "");
              }
            } else {
              fileContent = String(rawContent || "");
            }
            const isSelected = groundingFiles.includes(filePath);

            return (
              <button
                key={filePath}
                type="button"
                onClick={() =>
                  setSelectedFile({ path: filePath, content: fileContent })
                }
                className="cursor-pointer space-y-1 truncate rounded-md border border-border px-3 py-3 shadow-sm transition-colors"
                style={{
                  backgroundColor: "var(--color-file-button)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-file-button-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--color-file-button)";
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <FileText
                    size={24}
                    className="text-muted-foreground"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-foreground">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => toggleGrounding(filePath)}
                      disabled={editDisabled}
                      className="h-3.5 w-3.5 accent-foreground"
                    />
                    Ground
                  </label>
                </div>
                <span className="mx-auto block w-full truncate break-words text-left text-sm leading-relaxed text-foreground">
                  {filePath}
                </span>
                {isSelected && (
                  <span className="text-[10px] uppercase tracking-wide text-emerald-600">
                    Selected for grounding
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedFile && (
        <FileViewDialog
          file={selectedFile}
          onSaveFile={handleSaveFile}
          onClose={() => setSelectedFile(null)}
          editDisabled={editDisabled}
        />
      )}
    </>
  );
}

export const TasksFilesSidebar = React.memo<{
  todos: TodoItem[];
  files: Record<string, any>;
  setFiles: (files: Record<string, any>) => Promise<void>;
  groundingFiles: string[];
  setGroundingFiles: (files: string[]) => Promise<void>;
}>(({ todos, files, setFiles, groundingFiles, setGroundingFiles }) => {
  const { isLoading, interrupt } = useChatContext();
  const [tasksOpen, setTasksOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);

  // Track previous counts to detect when content goes from empty to having items
  const prevTodosCount = useRef(todos.length);
  const prevFilesCount = useRef(Object.keys(files).length);

  // Auto-expand when todos go from empty to having content
  useEffect(() => {
    if (prevTodosCount.current === 0 && todos.length > 0) {
      setTasksOpen(true);
    }
    prevTodosCount.current = todos.length;
  }, [todos.length]);

  // Auto-expand when files go from empty to having content
  const filesCount = Object.keys(files).length;
  useEffect(() => {
    if (prevFilesCount.current === 0 && filesCount > 0) {
      setFilesOpen(true);
    }
    prevFilesCount.current = filesCount;
  }, [filesCount]);

  const getStatusIcon = useCallback((status: TodoItem["status"]) => {
    switch (status) {
      case "completed":
        return (
          <CheckCircle
            size={12}
            className="text-success/80"
          />
        );
      case "in_progress":
        return (
          <Clock
            size={12}
            className="text-warning/80"
          />
        );
      default:
        return (
          <Circle
            size={10}
            className="text-tertiary/70"
          />
        );
    }
  }, []);

  const groupedTodos = useMemo(() => {
    return {
      pending: todos.filter((t) => t.status === "pending"),
      in_progress: todos.filter((t) => t.status === "in_progress"),
      completed: todos.filter((t) => t.status === "completed"),
    };
  }, [todos]);

  const groupedLabels = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return (
    <div className="min-h-0 w-full flex-1">
      <div className="font-inter flex h-full w-full flex-col p-0">
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <div className="flex items-center justify-between px-3 pb-1.5 pt-2">
            <span className="text-xs font-semibold tracking-wide text-zinc-600">
              AGENT TASKS
            </span>
            <button
              onClick={() => setTasksOpen((v) => !v)}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-transform duration-200 hover:bg-muted",
                tasksOpen ? "rotate-180" : "rotate-0"
              )}
              aria-label="Toggle tasks panel"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          {tasksOpen && (
            <div className="bg-muted-secondary rounded-xl px-3 pb-2">
              <ScrollArea className="h-full">
                {todos.length === 0 ? (
                  <div className="flex h-full items-center justify-center p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      No tasks created yet
                    </p>
                  </div>
                ) : (
                  <div className="ml-1 p-0.5">
                    {Object.entries(groupedTodos).map(([status, todos]) => (
                      <div className="mb-4">
                        <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-tertiary">
                          {groupedLabels[status as keyof typeof groupedLabels]}
                        </h3>
                        {todos.map((todo, index) => (
                          <div
                            key={`${status}_${todo.id}_${index}`}
                            className="mb-1.5 flex items-start gap-2 rounded-sm p-1 text-sm"
                          >
                            {getStatusIcon(todo.status)}
                            <span className="flex-1 break-words leading-relaxed text-inherit">
                              {todo.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          <div className="flex items-center justify-between px-3 pb-1.5 pt-2">
            <span className="text-xs font-semibold tracking-wide text-zinc-600">
              FILE SYSTEM
            </span>
            <button
              onClick={() => setFilesOpen((v) => !v)}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-transform duration-200 hover:bg-muted",
                filesOpen ? "rotate-180" : "rotate-0"
              )}
              aria-label="Toggle files panel"
            >
              <ChevronDown size={14} />
            </button>
          </div>
          {filesOpen && (
            <FilesPopover
              files={files}
              setFiles={setFiles}
              groundingFiles={groundingFiles}
              setGroundingFiles={setGroundingFiles}
              editDisabled={isLoading === true || interrupt !== undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
});

TasksFilesSidebar.displayName = "TasksFilesSidebar";
