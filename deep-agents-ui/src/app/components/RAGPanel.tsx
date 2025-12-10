"use client";

import React, { useRef, useState } from "react";
import { Database, FileUp, CheckCircle, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RAGPanelProps {
    groundingFiles: string[];
    setGroundingFiles: (files: string[]) => void;
}

export function RAGPanel({ groundingFiles, setGroundingFiles }: RAGPanelProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Note: For RAG, we ideally query the existing uploads from the server to show what's indexed.
    // But for now, we'll sync with the passed checked state or just show a "Knowledge Base" uploader.
    // The 'groundingFiles' prop tracks what is SELECTED for the current query.

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        setIsUploading(true);
        const files = Array.from(e.target.files);
        let successCount = 0;

        for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);

            try {
                // Upload to 'rag' bucket? Or default? 
                // Existing tools read from root uploads, so we keep default for compatibility unless we updated tools.py.
                // But we can organize them if we updated tools.py. 
                // Let's stick to default for now to ensure RAG works out of the box with existing agent.py
                const res = await fetch("/api/upload", { // ?bucket=rag if tools supported it
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) throw new Error("Upload failed");
                successCount++;
            } catch (err) {
                toast.error(`Failed to upload ${file.name}`);
            }
        }

        if (successCount > 0) {
            toast.success(`Uploaded ${successCount} files to Knowledge Base`);
            // Ideally trigger a refresh of the available files list here
            // But since we don't have a file list here yet (it was in TasksFilesSidebar), 
            // we might want to move that logic here or leave it abstract.
            // For distinct visual areas, this panel should list the RAG files.
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="flex flex-col h-full bg-[#121212]/50 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-cyan-900/20 to-transparent">
                <h2 className="text-sm font-medium text-cyan-400 tracking-wider uppercase flex items-center gap-2">
                    <Database size={16} /> Knowledge Base
                </h2>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="text-xs text-cyan-400/70 hover:text-cyan-400 border border-cyan-400/20 hover:border-cyan-400/50"
                >
                    {isUploading ? <RefreshCw className="animate-spin mr-2" size={14} /> : <FileUp size={14} className="mr-2" />}
                    Index
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    accept=".txt,.md,.pdf,.csv"
                    onChange={handleUpload}
                />
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="p-4 text-center">
                    {/* 
               TODO: List files that are currently in the 'uploads' directory on the server.
               I can add a Fetch here similar to WorkspacePanel but for the uploads dir.
             */}
                    <div className="text-gray-500 text-xs leading-relaxed">
                        Files uploaded here are indexed for Retrieval Augmented Generation (RAG).
                        <br /><br />
                        <span className="text-cyan-600/50 block mt-2 font-mono text-[10px]">
                            STATUS: ACTIVE
                        </span>
                    </div>
                </div>
            </ScrollArea>
            <div className="p-2 border-t border-white/5 text-[10px] text-gray-600 text-center uppercase tracking-widest font-semibold">
                Persistent • Vector Store
            </div>
        </div>
    );
}
