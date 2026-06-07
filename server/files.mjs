import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

export function getUploadRoot() {
  const configured = process.env.UPLOAD_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(projectRoot, configured);
  }
  return path.join(projectRoot, "data", "uploads");
}

export function ensureUploadRoot() {
  const root = getUploadRoot();
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function userUploadDir(userId) {
  const root = ensureUploadRoot();
  const dir = path.join(root, userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function extensionForMime(mimeType) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return ".jpg";
}

export function saveReceiptImage({ userId, buffer, mimeType, originalName }) {
  const safeMime = mimeType?.startsWith("image/") ? mimeType : "image/jpeg";
  const storageName = `${Date.now()}-${crypto.randomUUID()}${extensionForMime(safeMime)}`;
  const filePath = path.join(userUploadDir(userId), storageName);
  fs.writeFileSync(filePath, buffer);
  return {
    storageName,
    filePath,
    mimeType: safeMime,
    sizeBytes: buffer.length,
    originalName: sanitizeOriginalName(originalName),
  };
}

export function sanitizeOriginalName(name) {
  const base = path.basename(typeof name === "string" ? name : "receipt.jpg");
  return base.replace(/[^\w.\-()+ ]/g, "_").slice(0, 120) || "receipt.jpg";
}

export function getReceiptFilePath(userId, storageName) {
  const filePath = path.join(userUploadDir(userId), path.basename(storageName));
  if (!filePath.startsWith(userUploadDir(userId))) {
    throw new Error("Invalid file path");
  }
  return filePath;
}

export function deleteReceiptFile(userId, storageName) {
  try {
    const filePath = getReceiptFilePath(userId, storageName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Best-effort cleanup.
  }
}

export function decodeBase64Image(imageBase64) {
  const raw = typeof imageBase64 === "string" ? imageBase64.trim() : "";
  const payload = raw.includes(",") ? raw.split(",").pop() : raw;
  if (!payload) {
    throw new Error("Missing image data");
  }
  const buffer = Buffer.from(payload, "base64");
  if (buffer.length === 0) {
    throw new Error("Invalid image data");
  }
  if (buffer.length > 12 * 1024 * 1024) {
    throw new Error("Image is too large (max 12 MB).");
  }
  return buffer;
}
