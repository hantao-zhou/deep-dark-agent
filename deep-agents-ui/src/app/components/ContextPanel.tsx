"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileText, X, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContextPanelProps {
    files: Record<string, string>; // name -> content
    setFiles: (files: Record<string, string>) => void;
}

export function ContextPanel({ files, setFiles }: ContextPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            await processFiles(Array.from(e.target.files));
        }
    };

    const processFiles = async (fileList: File[]) => {
        const newFiles = { ...files };
        let count = 0;

        for (const file of fileList) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name} too large (limit 5MB for context)`);
                continue;
            }

            try {
                const text = await file.text();
                newFiles[file.name] = text;
                count++;
            } catch (err) {
                console.error(err);
                toast.error(`Failed to read ${file.name}`);
            }
        }

        setFiles(newFiles);
        if (count > 0) toast.success(`Added ${count} files to context`);
    };

    const removeFile = (name: string) => {
        const { [name]: _, ...rest } = files;
        setFiles(rest);
    };

    return (
        <div
            className={cn(
                "flex flex-col h-full bg-[#121212]/50 backdrop-blur-md border rounded-xl overflow-hidden shadow-2xl transition-all duration-300",
                isDragging ? "border-amber-400/50 bg-amber-900/10" : "border-white/5"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) {
                    await processFiles(Array.from(e.dataTransfer.files));
                }
            }}
        >
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-amber-900/20 to-transparent">
                <h2 className="text-sm font-medium text-amber-400 tracking-wider uppercase flex items-center gap-2">
                    <Sparkles size={16} /> In-Context Files
                </h2>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-amber-400/70 hover:text-amber-400 border border-amber-400/20 hover:border-amber-400/50"
                >
                    <UploadCloud size={14} className="mr-2" /> Upload
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept=".txt,.md,.json,.csv,.py,.js,.ts"
                    onChange={handleFileSelect}
                />
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {Object.keys(files).length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-600 space-y-2">
                            <UploadCloud size={24} className="opacity-20" />
                            <p className="text-xs italic text-center px-4">Drag files here for temporary in-context access</p>
                        </div>
                    )}
                    {Object.entries(files).map(([name, content]) => (
                        <div
                            key={name}
                            className="group flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all duration-200"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <FileText size={16} className="text-amber-500/80 shrink-0" />
                                <span className="text-sm text-gray-300 truncate font-light tracking-wide group-hover:text-white transition-colors">
                                    {name}
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-gray-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeFile(name)}
                            >
                                <X size={12} />
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <div className="p-2 border-t border-white/5 text-[10px] text-gray-600 text-center uppercase tracking-widest font-semibold">
                Session Only • Not Persisted
            </div>
        </div>
    );
}
