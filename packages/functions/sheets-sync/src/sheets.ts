import { google, sheets_v4 } from "googleapis";
import type { TokenData } from "./encryption.js";

export class GoogleSheetsClient {
  private getAuth(tokens: TokenData) {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    client.setCredentials(tokens);
    return client;
  }

  async refreshTokenIfExpired(tokens: TokenData): Promise<TokenData> {
    if (!tokens.expiry_date || tokens.expiry_date > Date.now()) {
      return tokens;
    }

    if (!tokens.refresh_token) {
      throw new Error("No refresh token available");
    }

    const client = this.getAuth(tokens);
    const { credentials } = await client.refreshAccessToken();

    return {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token ?? tokens.refresh_token,
      expiry_date: credentials.expiry_date ?? undefined,
    };
  }

  private getSheetsClient(tokens: TokenData): sheets_v4.Sheets {
    return google.sheets({ version: "v4", auth: this.getAuth(tokens) });
  }

  async getSheetMetadata(
    tokens: TokenData,
    spreadsheetId: string,
  ): Promise<{ sheetName: string }> {
    const sheets = this.getSheetsClient(tokens);
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });
    const sheetName = response.data.sheets?.[0]?.properties?.title || "Sheet1";
    return { sheetName };
  }

  async clearAndWrite(
    tokens: TokenData,
    spreadsheetId: string,
    data: (string | number)[][],
  ): Promise<void> {
    const sheets = this.getSheetsClient(tokens);
    const { sheetName } = await this.getSheetMetadata(tokens, spreadsheetId);

    // Clear entire sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: sheetName,
    });

    // Write all data
    if (data.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: data },
      });
    }
  }
}
