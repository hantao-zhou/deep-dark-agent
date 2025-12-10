"use client";

import React, { useRef, useState, useCallback } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onUploaded?: (filename: string) => void | Promise<void>;
  setFiles: (files: Record<string, any>) => Promise<void>;
  files: Record<string, any>;
  accept?: string;
  disabled?: boolean;
};

export function FileUploadButton({
  onUploaded,
  setFiles,
  files,
  accept = ".txt,.md,.markdown,.json,.csv",
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(() => {
    if (disabled) return;
    setError(null);
    inputRef.current?.click();
  }, [disabled]);

  const handleChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Upload failed");
        }
        const filename = data.filename as string;
        await setFiles({ ...files, [filename]: "uploaded" });
        await onUploaded?.(filename);
      } catch (err: any) {
        setError(err?.message || "Upload failed");
      } finally {
        setUploading(false);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    [files, setFiles, onUploaded]
  );

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={uploading || disabled}
        onClick={trigger}
        className="gap-1"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <UploadCloud className="h-4 w-4" />
            <span>Upload file</span>
          </>
        )}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
