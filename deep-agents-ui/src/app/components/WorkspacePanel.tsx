"use client";

import React, { useState, useEffect } from "react";
import { Folder, FileCode, RefreshCw, Trash2, Edit, Save, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface FileEntry {
    name: string;
    path: string;
    type: "file" | "directory";
    size: number;
}

export function WorkspacePanel() {
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPath, setCurrentPath] = useState("");
    const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);

    const fetchFiles = async (path = "") => {
        setLoading(true);
        try {
            const res = await fetch(`/api/workspace?path=${encodeURIComponent(path)}`);
            if (!res.ok) throw new Error("Failed to load files");
            const data = await res.json();
            setFiles(data.files || []);
            setCurrentPath(path);
        } catch (err) {
            toast.error("Error loading workspace files");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const handleEdit = async (filePath: string) => {
        try {
            const res = await fetch(`/api/workspace?path=${encodeURIComponent(filePath)}&action=read`);
            if (!res.ok) throw new Error("Failed to read file");
            const data = await res.json();
            setEditingFile({ path: filePath, content: data.content });
        } catch (err) {
            toast.error("Cannot read file");
        }
    };

    const handleSave = async () => {
        if (!editingFile) return;
        try {
            const res = await fetch("/api/workspace", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: editingFile.path, content: editingFile.content }),
            });
            if (!res.ok) throw new Error("Failed to save");
            toast.success("File saved");
            setEditingFile(null);
        } catch (err) {
            toast.error("Save failed");
        }
    };

    const handleDelete = async (filePath: string) => {
        if (!confirm(`Delete ${filePath}?`)) return;
        try {
            const res = await fetch(`/api/workspace?path=${encodeURIComponent(filePath)}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("Deleted");
            fetchFiles(currentPath);
        } catch (err) {
            toast.error("Delete failed");
        }
    }

    return (
        <div className="flex flex-col h-full bg-[#121212]/50 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-emerald-900/20 to-transparent">
                <h2 className="text-sm font-medium text-emerald-400 tracking-wider uppercase flex items-center gap-2">
                    <Folder size={16} /> Backend Workspace
                </h2>
                <Button variant="ghost" size="icon" onClick={() => fetchFiles(currentPath)} className="h-6 w-6 text-emerald-400/70 hover:text-emerald-400">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {currentPath && (
                        <div
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer text-gray-400 transition-colors"
                            onClick={() => fetchFiles(currentPath.split('/').slice(0, -1).join('/'))}
                        >
                            <Folder size={16} className="text-amber-500" />
                            <span className="text-xs">..</span>
                        </div>
                    )}
                    {files.map((file) => (
                        <div
                            key={file.path}
                            className="group flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/5"
                        >
                            <div
                                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                                onClick={() => file.type === "directory" ? fetchFiles(file.path) : handleEdit(file.path)}
                            >
                                {file.type === "directory" ? (
                                    <Folder size={16} className="text-amber-400 shrink-0" />
                                ) : (
                                    <FileCode size={16} className="text-emerald-500 shrink-0" />
                                )}
                                <span className="text-sm text-gray-300 truncate font-light tracking-wide group-hover:text-white transition-colors">
                                    {file.name}
                                </span>
                            </div>

                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                {file.type === "file" && (
                                    <>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-white" onClick={() => handleEdit(file.path)}>
                                            <Edit size={12} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-rose-400" onClick={() => handleDelete(file.path)}>
                                            <Trash2 size={12} />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {files.length === 0 && !loading && (
                        <div className="text-center p-8 text-gray-600 text-xs italic">
                            Empty workspace
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Basic Editor Dialog */}
            <Dialog open={!!editingFile} onOpenChange={(o) => !o && setEditingFile(null)}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-[#1a1a1a] border-white/10 text-gray-200">
                    <DialogHeader className="border-b border-white/5 pb-2">
                        <DialogTitle className="text-sm font-mono text-emerald-400">{editingFile?.path}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 p-2 overflow-hidden">
                        <textarea
                            className="w-full h-full bg-[#111] text-gray-300 font-mono text-sm p-4 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
                            value={editingFile?.content || ""}
                            onChange={(e) => setEditingFile(prev => prev ? { ...prev, content: e.target.value } : null)}
                            spellCheck={false}
                        />
                    </div>
                    <DialogFooter className="pt-2 border-t border-white/5">
                        <Button variant="ghost" size="sm" onClick={() => setEditingFile(null)} className="text-gray-400 hover:text-white">Cancel</Button>
                        <Button size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-lg shadow-emerald-900/20">
                            <Save size={14} className="mr-2" /> Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
