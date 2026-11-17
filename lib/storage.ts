import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Uploads live outside the bundle, so keep Turbopack from tracing the whole project.
export const UPLOAD_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MEDIA_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(EXTENSIONS).map(([mediaType, ext]) => [ext, mediaType]),
);

export const isAllowedMediaType = (mediaType: string) => mediaType in EXTENSIONS;

// Returns a path relative to UPLOAD_DIR, which is what documents.file_url stores.
export async function saveUpload(projectId: string, mediaType: string, data: Buffer) {
  const relativePath = path.join(/*turbopackIgnore: true*/ projectId, `${randomUUID()}.${EXTENSIONS[mediaType]}`);
  const fullPath = resolveUpload(relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
  return relativePath;
}

function resolveUpload(relativePath: string) {
  return path.resolve(/*turbopackIgnore: true*/ UPLOAD_DIR, relativePath);
}

export async function readUpload(relativePath: string) {
  return readFile(checkedUploadPath(relativePath));
}

// Removes a file saved by saveUpload, for example when the upload turned out to be a duplicate.
export async function deleteUpload(relativePath: string) {
  await rm(checkedUploadPath(relativePath), { force: true });
}

function checkedUploadPath(relativePath: string) {
  const fullPath = resolveUpload(relativePath);
  if (!fullPath.startsWith(UPLOAD_DIR + path.sep)) {
    throw new Error("Upload path is outside the uploads folder.");
  }
  return fullPath;
}

export function mediaTypeFor(relativePath: string) {
  const ext = path.extname(relativePath).slice(1);
  return MEDIA_TYPES[ext] ?? "application/octet-stream";
}
