import { BaseModel } from './BaseModel.js';
import { BodyWeightSchema } from '../schemas/bodyWeight.js';
import { parseBodyWeightRows } from '../utils/parser.js';
import { formatDate, parseDate } from '../utils/dateUtils.js';
import type { BodyWeightEntry, CreateBodyWeightInput } from '../types.js';

interface FindAllOptions {
  orderBy?: { date: 'asc' | 'desc' };
}

export class BodyWeightModel extends BaseModel {
  /**
   * Get all body weight entries
   */
  async findAll(options?: FindAllOptions): Promise<BodyWeightEntry[]> {
    const spreadsheetId = await this.findSheet(BodyWeightSchema.appProperty);
    if (!spreadsheetId) return [];

    const sheetName = await this.getSheetName(spreadsheetId);
    const rows = await this.sheets.get(this.tokens, spreadsheetId, `${sheetName}!A:B`);
    if (!rows) return [];

    const entries = parseBodyWeightRows(rows as string[][]);

    const order = options?.orderBy?.date ?? 'desc';
    return entries.sort((a, b) =>
      order === 'desc'
        ? b.date.getTime() - a.date.getTime()
        : a.date.getTime() - b.date.getTime()
    );
  }

  /**
   * Find a specific entry by date
   */
  async find(date: Date): Promise<BodyWeightEntry | null> {
    const entries = await this.findAll();
    const targetDateStr = formatDate(date);

    for (const entry of entries) {
      if (formatDate(entry.date) === targetDateStr) {
        return entry;
      }
    }
    return null;
  }

  /**
   * Create a new body weight entry
   */
  async create(input: CreateBodyWeightInput): Promise<BodyWeightEntry> {
    const date = input.date || new Date();
    const spreadsheetId = await this.getOrCreateSheet(
      BodyWeightSchema.sheetName,
      BodyWeightSchema.appProperty,
      [...BodyWeightSchema.headers]
    );

    const sheetName = await this.getSheetName(spreadsheetId);
    await this.sheets.appendRows(this.tokens, spreadsheetId, `${sheetName}!A:B`, [
      [formatDate(date), input.weight],
    ]);

    return { date, weight: input.weight };
  }

  /**
   * Update an existing entry by date
   */
  async update(date: Date, input: { weight: number }): Promise<BodyWeightEntry | null> {
    const spreadsheetId = await this.findSheet(BodyWeightSchema.appProperty);
    if (!spreadsheetId) return null;

    const sheetName = await this.getSheetName(spreadsheetId);
    const rows = await this.sheets.get(this.tokens, spreadsheetId, `${sheetName}!A:B`);
    if (!rows) return null;

    const targetDateStr = formatDate(date);

    // Find the row index (1-indexed, skip header)
    for (let i = 1; i < rows.length; i++) {
      const rowDate = String(rows[i][0] || '').trim();
      if (rowDate === targetDateStr) {
        // Update this row
        await this.sheets.update(
          this.tokens,
          spreadsheetId,
          `${sheetName}!B${i + 1}`,
          [[input.weight]]
        );
        return { date, weight: input.weight };
      }
    }

    return null;
  }

  /**
   * Create or update an entry (upsert)
   */
  async upsert(input: CreateBodyWeightInput): Promise<BodyWeightEntry> {
    const date = input.date || new Date();
    const existing = await this.find(date);

    if (existing) {
      const updated = await this.update(date, { weight: input.weight });
      return updated!;
    }

    return this.create(input);
  }
}
