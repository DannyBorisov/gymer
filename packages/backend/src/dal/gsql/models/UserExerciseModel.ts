import { BaseModel } from './BaseModel.js';
import { ExerciseSchema } from '../schemas/exercise.js';
import { parseExerciseRows } from '../utils/parser.js';
import type { UserExercise, CreateUserExerciseInput } from '../types.js';

export class UserExerciseModel extends BaseModel {
  /**
   * Get all exercises the user created for themselves
   */
  async findAll(): Promise<UserExercise[]> {
    const spreadsheetId = await this.findSheet(ExerciseSchema.appProperty);
    if (!spreadsheetId) return [];

    const sheetName = await this.getSheetName(spreadsheetId);
    const rows = await this.sheets.get(this.tokens, spreadsheetId, `${sheetName}!A:B`);
    if (!rows) return [];

    return parseExerciseRows(rows as string[][]);
  }

  /**
   * Create a new exercise
   */
  async create(input: CreateUserExerciseInput): Promise<UserExercise> {
    const spreadsheetId = await this.getOrCreateSheet(
      ExerciseSchema.sheetName,
      ExerciseSchema.appProperty,
      [...ExerciseSchema.headers]
    );

    const sheetName = await this.getSheetName(spreadsheetId);
    await this.sheets.appendRows(this.tokens, spreadsheetId, `${sheetName}!A:B`, [
      [input.name, input.muscleGroup],
    ]);

    return { name: input.name, muscleGroup: input.muscleGroup };
  }
}
