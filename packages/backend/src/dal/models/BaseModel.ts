import type { GoogleSheets } from '../../plugins/googleSheets.js';

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

const BASE_QUERY = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";

export abstract class BaseModel {
  constructor(
    protected sheets: GoogleSheets,
    protected tokens: AuthTokens
  ) {}

  /**
   * Build query string for finding sheets by app property
   */
  protected buildQuery(appProperty: { key: string; value: string }): string {
    return `${BASE_QUERY} and appProperties has { key='${appProperty.key}' and value='${appProperty.value}' }`;
  }

  /**
   * Find a sheet by app property, returns spreadsheet ID or null
   */
  protected async findSheet(appProperty: { key: string; value: string }): Promise<string | null> {
    const query = this.buildQuery(appProperty);
    const files = await this.sheets.listFiles(this.tokens, query);
    return files.length > 0 ? files[0].id : null;
  }

  /**
   * Get or create a sheet with the given name and app properties
   */
  protected async getOrCreateSheet(
    name: string,
    appProperty: { key: string; value: string },
    headers: string[]
  ): Promise<string> {
    const existingId = await this.findSheet(appProperty);
    if (existingId) return existingId;

    // Create new sheet
    const spreadsheetId = await this.sheets.create(this.tokens, name);
    await this.sheets.setFileProperties(this.tokens, spreadsheetId, {
      [appProperty.key]: appProperty.value,
    });
    await this.sheets.update(this.tokens, spreadsheetId, 'Sheet1!A1', [headers]);

    return spreadsheetId;
  }

  /**
   * Get the first sheet name in a spreadsheet
   */
  protected async getSheetName(spreadsheetId: string): Promise<string> {
    const { sheetName } = await this.sheets.getSpreadsheetMetadata(this.tokens, spreadsheetId);
    return sheetName;
  }
}
