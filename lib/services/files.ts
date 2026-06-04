import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import type { FileKind } from "@/lib/domain/types";

function filesRoot(): string {
  const env = process.env.FILES_ROOT;
  if (env) return env;
  return path.join(process.cwd(), "storage", "files");
}

export async function ensureFilesRoot(): Promise<string> {
  const root = filesRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

const MAX_BYTES = 15 * 1024 * 1024;

export async function saveOrderFile(input: {
  orderId: string;
  kind: FileKind;
  file: File;
  uploadedByUserId: string;
}): Promise<{ id: string; originalFileName: string }> {
  if (!isPdf(input.file)) throw new Error("Solo se permiten archivos PDF.");
  if (input.file.size > MAX_BYTES) throw new Error("El archivo supera el límite de 15 MB.");

  const root = await ensureFilesRoot();
  const orderDir = path.join(root, input.orderId);
  await fs.mkdir(orderDir, { recursive: true });

  const ext = path.extname(input.file.name) || ".pdf";
  const storedName = `${input.kind}_${Date.now()}${ext}`;
  const storagePath = path.join(orderDir, storedName);
  const buffer = Buffer.from(await input.file.arrayBuffer());
  await fs.writeFile(storagePath, buffer);

  const relativePath = path.join(input.orderId, storedName);
  const record = await prisma.storedFile.create({
    data: {
      orderId: input.orderId,
      kind: input.kind,
      originalFileName: input.file.name,
      storagePath: relativePath.replace(/\\/g, "/"),
      mimeType: input.file.type || "application/pdf",
      sizeBytes: input.file.size,
      uploadedByUserId: input.uploadedByUserId,
    },
  });

  return { id: record.id, originalFileName: record.originalFileName };
}

export async function getFileForDownload(fileId: string) {
  const file = await prisma.storedFile.findUnique({ where: { id: fileId } });
  if (!file) return null;
  const root = filesRoot();
  const abs = path.join(root, file.storagePath);
  return { file, absPath: abs };
}

export async function readFileBuffer(fileId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  originalFileName: string;
} | null> {
  const meta = await getFileForDownload(fileId);
  if (!meta) return null;
  try {
    const buffer = await fs.readFile(meta.absPath);
    return {
      buffer,
      mimeType: meta.file.mimeType,
      originalFileName: meta.file.originalFileName,
    };
  } catch {
    return null;
  }
}
