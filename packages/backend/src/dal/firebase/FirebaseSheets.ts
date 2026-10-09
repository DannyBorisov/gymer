/**
 * FirebaseSheets - GoogleSheets-compatible adapter using Firebase Storage
 *
 * Implements the same interface as GoogleSheets so GSQL models work unchanged.
 * Instead of calling Google Sheets API, reads/writes JSON files to Firebase Storage.
 */

import { FirebaseStorage, type SheetMetadata } from "./FirebaseStorage.js";

// Tokens interface (kept for API compatibility, but not used for Firebase)
interface Tokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

// Helper to generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to slugify names for file paths
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class FirebaseSheets {
  private storage: FirebaseStorage;
  private userEmail: string;

  constructor(userEmail: string) {
    this.storage = new FirebaseStorage();
    this.userEmail = userEmail;
  }

  /**
   * Create a new sheet (spreadsheet)
   * Returns a unique ID for the sheet
   */
  async create(_tokens: Tokens, title: string): Promise<string> {
    const id = slugify(title) || generateId();

    // Initialize with empty data
    await this.storage.set(this.userEmail, id, []);

    // Add to index
    await this.storage.addToIndex(this.userEmail, {
      id,
      name: title,
      createdTime: new Date().toISOString(),
    });

    return id;
  }

  /**
   * Set file properties (app properties for identifying sheet type)
   */
  async setFileProperties(
    _tokens: Tokens,
    fileId: string,
    appProperties: Record<string, string>,
  ): Promise<void> {
    await this.storage.updateMetadata(this.userEmail, fileId, { appProperties });
  }

  /**
   * Rename a file
   */
  async renameFile(_tokens: Tokens, fileId: string, name: string): Promise<void> {
    // Update the name in index (keep same ID/path)
    await this.storage.updateMetadata(this.userEmail, fileId, { name });
  }

  /**
   * List files matching a query
   * Query format: "appProperties has { key='X' and value='Y' }"
   */
  async listFiles(
    _tokens: Tokens,
    query: string,
  ): Promise<{ id: string; name: string; createdTime: string }[]> {
    const index = await this.storage.getIndex(this.userEmail);

    // Parse query to extract appProperty filter
    // Example: "mimeType='...' and appProperties has { key='createdBy' and value='ikkos' }"
    const keyMatch = query.match(/key='([^']+)'/);
    const valueMatch = query.match(/value='([^']+)'/);

    if (keyMatch && valueMatch) {
      const key = keyMatch[1];
      const value = valueMatch[1];

      return index.sheets.filter((sheet) => {
        return sheet.appProperties?.[key] === value;
      });
    }

    // No filter, return all
    return index.sheets;
  }

  /**
   * Get file name
   */
  async getFileName(_tokens: Tokens, fileId: string): Promise<string> {
    const metadata = await this.storage.getMetadata(this.userEmail, fileId);
    return metadata?.name || "";
  }

  /**
   * Delete a file
   */
  async deleteFile(_tokens: Tokens, fileId: string): Promise<void> {
    await this.storage.delete(this.userEmail, fileId);
  }

  /**
   * Copy a file
   */
  async copyFile(_tokens: Tokens, fileId: string, name: string): Promise<string> {
    // Read existing data
    const data = await this.storage.get(this.userEmail, fileId);

    // Create new file with copy
    const newId = slugify(name) || generateId();
    await this.storage.set(this.userEmail, newId, data || []);

    // Copy metadata
    const oldMetadata = await this.storage.getMetadata(this.userEmail, fileId);
    await this.storage.addToIndex(this.userEmail, {
      id: newId,
      name,
      createdTime: new Date().toISOString(),
      appProperties: oldMetadata?.appProperties,
    });

    return newId;
  }

  /**
   * Add a new sheet tab (not used with Firebase - sheets are single-tab)
   */
  async addSheet(
    _tokens: Tokens,
    _spreadsheetId: string,
    _sheetTitle: string,
  ): Promise<number> {
    // Firebase storage uses single JSON files, no tabs
    return 0;
  }

  /**
   * Update sheet data
   * Range is parsed to determine where to write (e.g., "Sheet1!A1" or "Sheet1!H5")
   */
  async update(
    _tokens: Tokens,
    spreadsheetId: string,
    range: string,
    values: (string | number)[][],
  ): Promise<void> {
    // Get current data
    let data = await this.storage.get(this.userEmail, spreadsheetId) || [];

    // Parse range to get starting position
    const rangeMatch = range.match(/!?([A-Z]+)(\d+)/);
    if (!rangeMatch) {
      // No range specified, overwrite from beginning
      data = values;
    } else {
      const startCol = this.colToIndex(rangeMatch[1]);
      const startRow = parseInt(rangeMatch[2], 10) - 1;

      // Expand data array if needed
      while (data.length < startRow + values.length) {
        data.push([]);
      }

      // Write values
      for (let i = 0; i < values.length; i++) {
        const rowIdx = startRow + i;
        while (data[rowIdx].length < startCol + values[i].length) {
          data[rowIdx].push("");
        }
        for (let j = 0; j < values[i].length; j++) {
          data[rowIdx][startCol + j] = values[i][j];
        }
      }
    }

    await this.storage.set(this.userEmail, spreadsheetId, data);
  }

  /**
   * Batch update multiple ranges
   * Reads once, applies all changes in memory, writes once
   */
  async batchUpdate(
    _tokens: Tokens,
    spreadsheetId: string,
    updates: { range: string; values: (string | number)[][] }[],
  ): Promise<void> {
    // Read current data once
    let data = await this.storage.get(this.userEmail, spreadsheetId) || [];

    // Apply all updates in memory
    for (const update of updates) {
      const rangeMatch = update.range.match(/!?([A-Z]+)(\d+)/);
      if (!rangeMatch) continue;

      const startCol = this.colToIndex(rangeMatch[1]);
      const startRow = parseInt(rangeMatch[2], 10) - 1;

      // Expand data array if needed
      while (data.length < startRow + update.values.length) {
        data.push([]);
      }

      // Write values
      for (let i = 0; i < update.values.length; i++) {
        const rowIdx = startRow + i;
        while (data[rowIdx].length < startCol + update.values[i].length) {
          data[rowIdx].push("");
        }
        for (let j = 0; j < update.values[i].length; j++) {
          data[rowIdx][startCol + j] = update.values[i][j];
        }
      }
    }

    // Write once
    await this.storage.set(this.userEmail, spreadsheetId, data);
  }

  /**
   * Clear a range
   */
  async clear(
    _tokens: Tokens,
    spreadsheetId: string,
    range: string,
  ): Promise<void> {
    // Parse range to determine what to clear
    const rangeMatch = range.match(/!?([A-Z]+)(\d+)(?::([A-Z]+)(\d*)?)?/);

    if (!rangeMatch) {
      // Clear everything
      await this.storage.set(this.userEmail, spreadsheetId, []);
      return;
    }

    const data = await this.storage.get(this.userEmail, spreadsheetId) || [];
    const startCol = this.colToIndex(rangeMatch[1]);
    const startRow = parseInt(rangeMatch[2], 10) - 1;
    const endCol = rangeMatch[3] ? this.colToIndex(rangeMatch[3]) : startCol;
    const endRow = rangeMatch[4] ? parseInt(rangeMatch[4], 10) - 1 : data.length - 1;

    for (let row = startRow; row <= endRow && row < data.length; row++) {
      for (let col = startCol; col <= endCol && col < data[row].length; col++) {
        data[row][col] = "";
      }
    }

    // If clearing from row 2 onwards (A2:Z or similar), remove empty trailing rows
    if (startRow > 0 && startCol === 0 && endCol >= 25) {
      // Keep header, remove data rows
      data.splice(startRow);
    }

    await this.storage.set(this.userEmail, spreadsheetId, data);
  }

  /**
   * Get sheet data
   */
  async get(
    _tokens: Tokens,
    spreadsheetId: string,
    _range: string,
  ): Promise<(string | number)[][] | null> {
    return this.storage.get(this.userEmail, spreadsheetId);
  }

  /**
   * Get spreadsheet metadata
   * Returns dummy sheet name/ID since we don't have tabs
   */
  async getSpreadsheetMetadata(
    _tokens: Tokens,
    _spreadsheetId: string,
  ): Promise<{ sheetName: string; sheetId: number }> {
    return {
      sheetName: "Sheet1",
      sheetId: 0,
    };
  }

  /**
   * Insert a row at given position
   */
  async insertRow(
    _tokens: Tokens,
    spreadsheetId: string,
    _sheetId: number,
    rowIndex: number,
  ): Promise<void> {
    const data = await this.storage.get(this.userEmail, spreadsheetId) || [];

    // Insert empty row at position (1-indexed)
    const insertAt = rowIndex - 1;
    data.splice(insertAt, 0, []);

    await this.storage.set(this.userEmail, spreadsheetId, data);
  }

  /**
   * Delete a row at given position
   */
  async deleteRow(
    _tokens: Tokens,
    spreadsheetId: string,
    _sheetId: number,
    rowIndex: number,
  ): Promise<void> {
    const data = await this.storage.get(this.userEmail, spreadsheetId) || [];

    // Delete row at position (1-indexed)
    const deleteAt = rowIndex - 1;
    if (deleteAt >= 0 && deleteAt < data.length) {
      data.splice(deleteAt, 1);
    }

    await this.storage.set(this.userEmail, spreadsheetId, data);
  }

  /**
   * Append rows to the end of the sheet
   */
  async appendRows(
    _tokens: Tokens,
    spreadsheetId: string,
    _range: string,
    values: (string | number)[][],
  ): Promise<void> {
    const data = await this.storage.get(this.userEmail, spreadsheetId) || [];
    data.push(...values);
    await this.storage.set(this.userEmail, spreadsheetId, data);
  }

  // Helper: Convert column letter to 0-indexed number
  private colToIndex(col: string): number {
    let idx = 0;
    for (let i = 0; i < col.length; i++) {
      idx = idx * 26 + (col.charCodeAt(i) - "A".charCodeAt(0) + 1);
    }
    return idx - 1;
  }
}
