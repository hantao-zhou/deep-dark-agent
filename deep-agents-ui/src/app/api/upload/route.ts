import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB
const BASE_UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.resolve(process.cwd(), "..", "uploads");

const sanitizeName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const bucket = new URL(req.url).searchParams.get("bucket") || "";

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large (> ${MAX_UPLOAD_BYTES} bytes)` },
      { status: 413 }
    );
  }

  // Prevent directory traversal
  const safeBucket = bucket.replace(/[^a-zA-Z0-9_-]/g, "");
  const uploadDir = safeBucket ? path.join(BASE_UPLOAD_DIR, safeBucket) : BASE_UPLOAD_DIR;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const ext = path.extname(file.name) || ".bin";
  const base = sanitizeName(path.basename(file.name, ext)) || "upload";
  const filename = `${base}-${Date.now()}${ext}`;
  const targetPath = path.join(uploadDir, filename);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(targetPath, buffer);

  return NextResponse.json({ filename, path: safeBucket ? `${safeBucket}/${filename}` : filename });
}
