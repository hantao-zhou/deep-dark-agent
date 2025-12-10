import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile, writeFile, unlink, stat, mkdir } from "fs/promises";
import path from "path";

// Define the workspace root. 
// Assuming the backend workspace is the sibling directory 'deepagents-quickstarts'
const WORKSPACE_DIR = process.env.AGENT_WORKSPACE_DIR || path.resolve(process.cwd(), "..", "deepagents-quickstarts");

// Helper to ensure path is within workspace
const getSafePath = (targetPath: string) => {
    const resolved = path.resolve(WORKSPACE_DIR, targetPath);
    if (!resolved.startsWith(WORKSPACE_DIR)) {
        throw new Error("Access denied");
    }
    return resolved;
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const relativePath = searchParams.get("path") || "";
    const action = searchParams.get("action"); // 'list' or 'read'

    try {
        const fullPath = getSafePath(relativePath);

        if (action === "read") {
            const content = await readFile(fullPath, "utf-8");
            return NextResponse.json({ content });
        }

        // Default: list directory
        const entries = await readdir(fullPath, { withFileTypes: true });

        const files = await Promise.all(
            entries.map(async (entry) => {
                const entryPath = path.join(fullPath, entry.name);
                const stats = await stat(entryPath);
                return {
                    name: entry.name,
                    path: path.relative(WORKSPACE_DIR, entryPath),
                    type: entry.isDirectory() ? "directory" : "file",
                    size: stats.size,
                    updatedAt: stats.mtime,
                };
            })
        );

        return NextResponse.json({ files });

    } catch (error) {
        console.error("Workspace API Error:", error);
        return NextResponse.json({ error: "Failed to access workspace" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { path: relativePath, content } = body;

        if (!relativePath) {
            return NextResponse.json({ error: "Path is required" }, { status: 400 });
        }

        const fullPath = getSafePath(relativePath);

        // Ensure directory exists
        await mkdir(path.dirname(fullPath), { recursive: true });
        await writeFile(fullPath, content);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Workspace Write Error:", error);
        return NextResponse.json({ error: "Failed to write file" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const relativePath = searchParams.get("path");

    if (!relativePath) {
        return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    try {
        const fullPath = getSafePath(relativePath);
        await unlink(fullPath);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Workspace Delete Error:", error);
        return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }
}
