// ============================================
// File Storage Service
// Supports: local filesystem (dev) and S3 (prod)
// ============================================

import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StorageResult {
  url: string;       // Public URL
  filePath: string;  // Storage path/key
  sizeBytes: number;
}

export interface StorageProvider {
  upload(buffer: Buffer, filename: string, mimeType: string, folder?: string): Promise<StorageResult>;
  delete(filePath: string): Promise<void>;
}

// ============================================
// Local Filesystem Provider (development)
// ============================================

class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = path.join(process.cwd(), 'public', 'uploads');
    this.baseUrl = '/uploads';
  }

  async upload(buffer: Buffer, filename: string, mimeType: string, folder: string = 'general'): Promise<StorageResult> {
    const ext = this.getExtension(mimeType, filename);
    const uniqueName = `${uuidv4()}${ext}`;
    const folderPath = path.join(this.basePath, folder);
    const filePath = path.join(folderPath, uniqueName);

    // Ensure directory exists
    await fs.mkdir(folderPath, { recursive: true });

    // Write file
    await fs.writeFile(filePath, buffer);

    return {
      url: `${this.baseUrl}/${folder}/${uniqueName}`,
      filePath: `${folder}/${uniqueName}`,
      sizeBytes: buffer.length,
    };
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    try {
      await fs.unlink(fullPath);
    } catch {
      // File may not exist, that's ok
    }
  }

  private getExtension(mimeType: string, filename: string): string {
    const mimeExtMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'audio/webm': '.webm',
      'audio/wav': '.wav',
      'audio/mp3': '.mp3',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
    };

    if (mimeExtMap[mimeType]) return mimeExtMap[mimeType];

    const ext = path.extname(filename);
    return ext || '.bin';
  }
}

// ============================================
// S3 Provider (production) - Integration point
// ============================================

class S3StorageProvider implements StorageProvider {
  constructor() {
    const required = ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`S3 configuration missing: ${missing.join(', ')}`);
    }
  }

  async upload(buffer: Buffer, filename: string, mimeType: string, folder: string = 'general'): Promise<StorageResult> {
    // This is the integration point for S3-compatible storage
    // In production, implement using @aws-sdk/client-s3
    const ext = path.extname(filename) || '.bin';
    const key = `${folder}/${uuidv4()}${ext}`;

    // TODO: Implement actual S3 upload
    // const s3 = new S3Client({ region: process.env.S3_REGION, ... });
    // await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: buffer, ContentType: mimeType }));

    throw new Error('S3 storage provider not fully implemented. Use STORAGE_PROVIDER=local for development.');

    return {
      url: `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`,
      filePath: key,
      sizeBytes: buffer.length,
    };
  }

  async delete(filePath: string): Promise<void> {
    // TODO: Implement actual S3 delete
    throw new Error('S3 delete not implemented');
  }
}

// ============================================
// Factory
// ============================================

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (storageInstance) return storageInstance;

  const provider = process.env.STORAGE_PROVIDER || 'local';

  switch (provider) {
    case 's3':
      storageInstance = new S3StorageProvider();
      break;
    case 'local':
    default:
      storageInstance = new LocalStorageProvider();
      break;
  }

  return storageInstance;
}
