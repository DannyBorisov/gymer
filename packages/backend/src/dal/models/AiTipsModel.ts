import { BaseModel } from './BaseModel.js';
import { AiTipsSchema } from '../schemas/aiTips.js';
import { formatDate } from '../utils/dateUtils.js';
import type { AiTip, CreateAiTipInput } from '../types.js';

export class AiTipsModel extends BaseModel {
  /**
   * Get recent AI tips (for feeding back to the AI)
   */
  async findRecent(limit = 10): Promise<AiTip[]> {
    const spreadsheetId = await this.findSheet(AiTipsSchema.appProperty);
    if (!spreadsheetId) return [];

    const sheetName = await this.getSheetName(spreadsheetId);
    const rows = await this.sheets.get(this.tokens, spreadsheetId, `${sheetName}!A:D`);
    if (!rows || rows.length <= 1) return [];

    // Skip header, parse rows
    const tips: AiTip[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] && row[3]) {
        tips.push({
          date: new Date(row[0]),
          programName: String(row[1] || ''),
          workoutName: String(row[2] || ''),
          tip: String(row[3] || ''),
        });
      }
    }

    // Sort by date descending and limit
    return tips
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }

  /**
   * Create a new AI tip entry
   */
  async create(input: CreateAiTipInput): Promise<AiTip> {
    const date = new Date();
    const spreadsheetId = await this.getOrCreateSheet(
      AiTipsSchema.sheetName,
      AiTipsSchema.appProperty,
      [...AiTipsSchema.headers]
    );

    const sheetName = await this.getSheetName(spreadsheetId);
    await this.sheets.appendRows(this.tokens, spreadsheetId, `${sheetName}!A:D`, [
      [formatDate(date), input.programName, input.workoutName, input.tip],
    ]);

    return {
      date,
      programName: input.programName,
      workoutName: input.workoutName,
      tip: input.tip,
    };
  }
}
