/**
 * FirebaseStorage - Low-level Firebase Storage operations for sheet data
 *
 * Stores sheet data as JSON files in Firebase Storage.
 * Path structure: users/{email}/sheets/{name}.json
 */

import { getStorage, type Storage } from "firebase-admin/storage";
import { getApps } from "firebase-admin/app";
import config from "../../config.js";

// Sheet metadata stored in _index.json
export interface SheetMetadata {
  id: string; // Same as name (slugified)
  name: string; // Display name
  createdTime: string; // ISO date
  appProperties?: Record<string, string>;
}

export interface SheetIndex {
  sheets: SheetMetadata[];
}

const INDEX_FILE = "_index.json";

// Singleton bucket to avoid listener accumulation
let bucketInstance: ReturnType<Storage["bucket"]> | null = null;

function getBucket(): ReturnType<Storage["bucket"]> {
  if (!bucketInstance) {
    if (getApps().length === 0) {
      throw new Error("Firebase must be initialized before using FirebaseStorage");
    }
    const storage = getStorage();
    bucketInstance = storage.bucket(config.env.FIREBASE_STORAGE_BUCKET);
    // Increase max listeners to avoid warnings during batch operations
    bucketInstance.setMaxListeners(50);
  }
  return bucketInstance;
}

export class FirebaseStorage {
  private bucket: ReturnType<Storage["bucket"]>;

  constructor() {
    this.bucket = getBucket();
  }

  private getPath(userEmail: string, sheetName: string): string {
    // Sanitize email for path (replace @ and . with safe chars)
    const safeEmail = userEmail.replace(/@/g, "_at_").replace(/\./g, "_");
    return `users/${safeEmail}/sheets/${sheetName}.json`;
  }

  private getIndexPath(userEmail: string): string {
    const safeEmail = userEmail.replace(/@/g, "_at_").replace(/\./g, "_");
    return `users/${safeEmail}/sheets/${INDEX_FILE}`;
  }

  /**
   * Read sheet data
   */
  async get(userEmail: string, sheetName: string): Promise<(string | number)[][] | null> {
    try {
      const file = this.bucket.file(this.getPath(userEmail, sheetName));
      const [exists] = await file.exists();
      if (!exists) return null;

      const [content] = await file.download();
      return JSON.parse(content.toString());
    } catch (error) {
      console.error(`[FirebaseStorage] Error reading ${sheetName}:`, error);
      return null;
    }
  }

  /**
   * Write sheet data
   */
  async set(userEmail: string, sheetName: string, data: (string | number)[][]): Promise<void> {
    const file = this.bucket.file(this.getPath(userEmail, sheetName));
    await file.save(JSON.stringify(data), {
      contentType: "application/json",
      metadata: {
        cacheControl: "no-cache",
      },
    });
  }

  /**
   * Delete sheet
   */
  async delete(userEmail: string, sheetName: string): Promise<void> {
    const file = this.bucket.file(this.getPath(userEmail, sheetName));
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
    }
    // Also remove from index
    await this.removeFromIndex(userEmail, sheetName);
  }

  /**
   * Check if sheet exists
   */
  async exists(userEmail: string, sheetName: string): Promise<boolean> {
    const file = this.bucket.file(this.getPath(userEmail, sheetName));
    const [exists] = await file.exists();
    return exists;
  }

  /**
   * Rename sheet
   */
  async rename(userEmail: string, oldName: string, newName: string): Promise<void> {
    const oldFile = this.bucket.file(this.getPath(userEmail, oldName));
    const newFile = this.bucket.file(this.getPath(userEmail, newName));

    // Copy to new location
    await oldFile.copy(newFile);
    // Delete old file
    await oldFile.delete();

    // Update index
    const index = await this.getIndex(userEmail);
    const sheet = index.sheets.find((s) => s.id === oldName);
    if (sheet) {
      sheet.id = newName;
      sheet.name = newName;
      await this.saveIndex(userEmail, index);
    }
  }

  /**
   * Get sheet index (list of all sheets for user)
   */
  async getIndex(userEmail: string): Promise<SheetIndex> {
    try {
      const file = this.bucket.file(this.getIndexPath(userEmail));
      const [exists] = await file.exists();
      if (!exists) {
        return { sheets: [] };
      }

      const [content] = await file.download();
      return JSON.parse(content.toString());
    } catch {
      return { sheets: [] };
    }
  }

  /**
   * Save sheet index
   */
  async saveIndex(userEmail: string, index: SheetIndex): Promise<void> {
    const file = this.bucket.file(this.getIndexPath(userEmail));
    await file.save(JSON.stringify(index), {
      contentType: "application/json",
      metadata: {
        cacheControl: "no-cache",
      },
    });
  }

  /**
   * Add sheet to index
   */
  async addToIndex(userEmail: string, metadata: SheetMetadata): Promise<void> {
    const index = await this.getIndex(userEmail);
    // Remove if exists (for updates)
    index.sheets = index.sheets.filter((s) => s.id !== metadata.id);
    // Add to beginning
    index.sheets.unshift(metadata);
    await this.saveIndex(userEmail, index);
  }

  /**
   * Remove sheet from index
   */
  async removeFromIndex(userEmail: string, sheetId: string): Promise<void> {
    const index = await this.getIndex(userEmail);
    index.sheets = index.sheets.filter((s) => s.id !== sheetId);
    await this.saveIndex(userEmail, index);
  }

  /**
   * Get sheet metadata from index
   */
  async getMetadata(userEmail: string, sheetId: string): Promise<SheetMetadata | null> {
    const index = await this.getIndex(userEmail);
    return index.sheets.find((s) => s.id === sheetId) || null;
  }

  /**
   * Update sheet metadata in index
   */
  async updateMetadata(
    userEmail: string,
    sheetId: string,
    updates: Partial<SheetMetadata>,
  ): Promise<void> {
    const index = await this.getIndex(userEmail);
    const sheet = index.sheets.find((s) => s.id === sheetId);
    if (sheet) {
      Object.assign(sheet, updates);
      await this.saveIndex(userEmail, index);
    }
  }
}
