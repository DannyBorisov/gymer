/**
 * SheetCache - Caches Google Sheets data in PostgreSQL
 *
 * Stores raw sheet data (rows) exactly as they appear in Google Sheets.
 * All reads come from cache. Writes go to cache immediately, then sync to Sheets.
 */

import { prismaClient } from "../postgres/client.js";

export class SheetCache {
  constructor(private userEmail: string) {}

  /**
   * Get cached sheet data
   */
  async get(spreadsheetId: string): Promise<(string | number)[][] | null> {
    const cached = await prismaClient.sheetCache.findUnique({
      where: {
        userEmail_spreadsheetId: {
          userEmail: this.userEmail,
          spreadsheetId,
        },
      },
    });

    if (!cached) return null;
    return cached.data as unknown as (string | number)[][];
  }

  /**
   * Set cached sheet data
   */
  async set(spreadsheetId: string, data: (string | number)[][]): Promise<void> {
    await prismaClient.sheetCache.upsert({
      where: {
        userEmail_spreadsheetId: {
          userEmail: this.userEmail,
          spreadsheetId,
        },
      },
      create: {
        userEmail: this.userEmail,
        spreadsheetId,
        data: data as unknown as any,
      },
      update: {
        data: data as unknown as any,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete cached sheet data
   */
  async delete(spreadsheetId: string): Promise<void> {
    await prismaClient.sheetCache.deleteMany({
      where: {
        userEmail: this.userEmail,
        spreadsheetId,
      },
    });
  }

  /**
   * Check if sheet is cached
   */
  async exists(spreadsheetId: string): Promise<boolean> {
    const count = await prismaClient.sheetCache.count({
      where: {
        userEmail: this.userEmail,
        spreadsheetId,
      },
    });
    return count > 0;
  }

  /**
   * Mark sheet as needing sync to Google Sheets
   */
  async markDirty(spreadsheetId: string): Promise<void> {
    await prismaClient.sheetCache.update({
      where: {
        userEmail_spreadsheetId: {
          userEmail: this.userEmail,
          spreadsheetId,
        },
      },
      data: {
        needsSync: true,
      },
    });
  }

  /**
   * Mark sheet as synced
   */
  async markSynced(spreadsheetId: string): Promise<void> {
    await prismaClient.sheetCache.update({
      where: {
        userEmail_spreadsheetId: {
          userEmail: this.userEmail,
          spreadsheetId,
        },
      },
      data: {
        needsSync: false,
        lastSyncedAt: new Date(),
      },
    });
  }

  /**
   * Get all sheets that need syncing
   */
  async getDirtySheets(): Promise<{ spreadsheetId: string; data: (string | number)[][] }[]> {
    const dirty = await prismaClient.sheetCache.findMany({
      where: {
        userEmail: this.userEmail,
        needsSync: true,
      },
    });

    return dirty.map((d) => ({
      spreadsheetId: d.spreadsheetId,
      data: d.data as unknown as (string | number)[][],
    }));
  }
}
