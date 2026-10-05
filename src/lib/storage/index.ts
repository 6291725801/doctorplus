import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface UploadResult {
  url: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface StorageProvider {
  uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folder?: string
  ): Promise<UploadResult>;
  deleteFile(fileKey: string): Promise<boolean>;
}

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), "public/uploads");
  }

  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = "media"
  ): Promise<UploadResult> {
    const targetDir = path.join(this.uploadDir, folder);
    await this.ensureDir(targetDir);

    const ext = path.extname(originalName) || ".jpg";
    const sanitizedBase = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const generatedFileName = `${sanitizedBase}_${uniqueSuffix}${ext}`;
    const filePath = path.join(targetDir, generatedFileName);

    await fs.writeFile(filePath, fileBuffer);

    const fileKey = `${folder}/${generatedFileName}`;
    const url = `/uploads/${fileKey}`;

    return {
      url,
      fileKey,
      fileName: originalName,
      mimeType,
      sizeBytes: fileBuffer.length,
    };
  }

  async deleteFile(fileKey: string): Promise<boolean> {
    try {
      const sanitizedKey = path.normalize(fileKey).replace(/^(\.\.(\/|\\|$))+/, "");
      const fullPath = path.join(this.uploadDir, sanitizedKey);
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

export const storage: StorageProvider = new LocalStorageProvider();
