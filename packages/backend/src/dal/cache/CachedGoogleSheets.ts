/**
 * CachedGoogleSheets - A wrapper around GoogleSheets that caches data in PostgreSQL
 *
 * All reads come from cache (fast, no quota).
 * All writes go to cache immediately, optionally syncing to Sheets.
 *
 * This wrapper has the same interface as GoogleSheets, so GSQL models work unchanged.
 */

import type { GoogleSheets } from "../../plugins/googleSheets.js";
import { SheetCache } from "./SheetCache.js";

interface Tokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export class CachedGoogleSheets {
  private cache: SheetCache;
  private syncToSheets: boolean;

  constructor(
    private sheets: GoogleSheets,
    private userEmail: string,
    options?: { syncToSheets?: boolean },
  ) {
    this.cache = new SheetCache(userEmail);
    this.syncToSheets = options?.syncToSheets ?? false;
  }

  /**
   * Get sheet data - from cache if available, otherwise fetch from Sheets and cache
   */
  async get(
    tokens: Tokens,
    spreadsheetId: string,
    range: string,
  ): Promise<(string | number)[][] | null> {
    // Try cache first
    const cached = await this.cache.get(spreadsheetId);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from Sheets
    const data = await this.sheets.get(tokens, spreadsheetId, range);
    if (data) {
      await this.cache.set(spreadsheetId, data);
    }
    return data;
  }

  /**
   * Update sheet data - writes to cache, optionally syncs to Sheets
   */
  async update(
    tokens: Tokens,
    spreadsheetId: string,
    range: string,
    values: (string | number)[][],
  ): Promise<void> {
    // Get current cached data
    let data = await this.cache.get(spreadsheetId);

    // Parse range to find starting row/col (e.g., "Sheet1!A2" -> row 2, col A)
    const rangeMatch = range.match(/!?([A-Z]+)(\d+)/);
    if (!rangeMatch || !data) {
      // If can't parse or no cached data, just write directly to sheets
      if (this.syncToSheets) {
        await this.sheets.update(tokens, spreadsheetId, range, values);
      }
      return;
    }

    const startCol = this.colToIndex(rangeMatch[1]);
    const startRow = parseInt(rangeMatch[2], 10) - 1; // 0-indexed

    // Apply updates to cached data
    for (let i = 0; i < values.length; i++) {
      const rowIdx = startRow + i;
      // Ensure row exists
      while (data.length <= rowIdx) {
        data.push([]);
      }
      for (let j = 0; j < values[i].length; j++) {
        const colIdx = startCol + j;
        // Ensure column exists
        while (data[rowIdx].length <= colIdx) {
          data[rowIdx].push("");
        }
        data[rowIdx][colIdx] = values[i][j];
      }
    }

    // Update cache
    await this.cache.set(spreadsheetId, data);

    // Optionally sync to Sheets
    if (this.syncToSheets) {
      await this.sheets.update(tokens, spreadsheetId, range, values);
      await this.cache.markSynced(spreadsheetId);
    } else {
      await this.cache.markDirty(spreadsheetId);
    }
  }

  /**
   * Batch update sheet data
   */
  async batchUpdate(
    tokens: Tokens,
    spreadsheetId: string,
    data: { range: string; values: (string | number)[][] }[],
  ): Promise<void> {
    // Apply each update to cache
    for (const update of data) {
      await this.update(tokens, spreadsheetId, update.range, update.values);
    }

    // If syncing, use batch update for efficiency
    if (this.syncToSheets) {
      await this.sheets.batchUpdate(tokens, spreadsheetId, data);
      await this.cache.markSynced(spreadsheetId);
    }
  }

  /**
   * Append rows to sheet
   */
  async appendRows(
    tokens: Tokens,
    spreadsheetId: string,
    range: string,
    values: (string | number)[][],
  ): Promise<void> {
    // Get current cached data
    let data = await this.cache.get(spreadsheetId);
    if (!data) {
      data = [];
    }

    // Append new rows
    data.push(...values);

    // Update cache
    await this.cache.set(spreadsheetId, data);

    // Optionally sync to Sheets
    if (this.syncToSheets) {
      await this.sheets.appendRows(tokens, spreadsheetId, range, values);
      await this.cache.markSynced(spreadsheetId);
    } else {
      await this.cache.markDirty(spreadsheetId);
    }
  }

  /**
   * Clear sheet data
   */
  async clear(
    tokens: Tokens,
    spreadsheetId: string,
    range: string,
  ): Promise<void> {
    // Clear cache
    await this.cache.delete(spreadsheetId);

    // Optionally sync to Sheets
    if (this.syncToSheets) {
      await this.sheets.clear(tokens, spreadsheetId, range);
    }
  }

  /**
   * Sync all dirty sheets to Google Sheets
   * Call this on workout completion or other sync points
   */
  async syncDirtySheets(tokens: Tokens): Promise<void> {
    const dirty = await this.cache.getDirtySheets();

    for (const sheet of dirty) {
      // Get the full range for the sheet
      const { sheetName } = await this.sheets.getSpreadsheetMetadata(tokens, sheet.spreadsheetId);
      const range = `${sheetName}!A1`;

      // Clear and rewrite the entire sheet
      await this.sheets.clear(tokens, sheet.spreadsheetId, `${sheetName}!A:Z`);
      if (sheet.data.length > 0) {
        await this.sheets.update(tokens, sheet.spreadsheetId, range, sheet.data);
      }

      await this.cache.markSynced(sheet.spreadsheetId);
    }
  }

  // ============================================================================
  // Pass-through methods that don't involve data caching
  // ============================================================================

  async create(tokens: Tokens, title: string): Promise<string> {
    return this.sheets.create(tokens, title);
  }

  async setFileProperties(
    tokens: Tokens,
    fileId: string,
    appProperties: Record<string, string>,
  ): Promise<void> {
    return this.sheets.setFileProperties(tokens, fileId, appProperties);
  }

  async renameFile(tokens: Tokens, fileId: string, name: string): Promise<void> {
    return this.sheets.renameFile(tokens, fileId, name);
  }

  async listFiles(
    tokens: Tokens,
    query: string,
  ): Promise<{ id: string; name: string; createdTime: string }[]> {
    return this.sheets.listFiles(tokens, query);
  }

  async getFileName(tokens: Tokens, fileId: string): Promise<string> {
    return this.sheets.getFileName(tokens, fileId);
  }

  async deleteFile(tokens: Tokens, fileId: string): Promise<void> {
    // Also delete from cache
    await this.cache.delete(fileId);
    return this.sheets.deleteFile(tokens, fileId);
  }

  async copyFile(tokens: Tokens, fileId: string, name: string): Promise<string> {
    const newId = await this.sheets.copyFile(tokens, fileId, name);
    // Copy cache too
    const cached = await this.cache.get(fileId);
    if (cached) {
      await this.cache.set(newId, cached);
    }
    return newId;
  }

  async addSheet(tokens: Tokens, spreadsheetId: string, sheetTitle: string): Promise<number> {
    return this.sheets.addSheet(tokens, spreadsheetId, sheetTitle);
  }

  async getSpreadsheetMetadata(
    tokens: Tokens,
    spreadsheetId: string,
  ): Promise<{ sheetName: string; sheetId: number }> {
    return this.sheets.getSpreadsheetMetadata(tokens, spreadsheetId);
  }

  async insertRow(
    tokens: Tokens,
    spreadsheetId: string,
    sheetId: number,
    rowIndex: number,
  ): Promise<void> {
    // Insert blank row into cached data
    let data = await this.cache.get(spreadsheetId);
    if (data) {
      const newRow: (string | number)[] = [];
      data.splice(rowIndex - 1, 0, newRow); // rowIndex is 1-indexed
      await this.cache.set(spreadsheetId, data);
    }

    if (this.syncToSheets) {
      await this.sheets.insertRow(tokens, spreadsheetId, sheetId, rowIndex);
      await this.cache.markSynced(spreadsheetId);
    } else {
      await this.cache.markDirty(spreadsheetId);
    }
  }


  // Convert column letter to 0-indexed number (A=0, B=1, etc.)
  private colToIndex(col: string): number {
    let idx = 0;
    for (let i = 0; i < col.length; i++) {
      idx = idx * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return idx - 1;
  }
}
