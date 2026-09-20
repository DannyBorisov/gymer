import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { google, sheets_v4, drive_v3 } from "googleapis";
import config from "../config.js";

interface Tokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export interface UserInfo {
  email: string;
  name: string;
  picture: string;
}

const BASE_QUERY =
  "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";

export const AppProperties = {
  program: { key: "createdBy", value: "gymerr" },
  quickWorkouts: {
    key: "gymerrQuickWorkouts",
    value: "true",
    title: "Quick Workouts",
  },
  bodyWeight: { key: "gymerrBodyWeight", value: "true", title: "Body Weight" },
} as const;

export type AppPropertyType = keyof typeof AppProperties;

export class GoogleSheets {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri,
    );
  }

  // A per-call OAuth2 client so concurrent requests don't clobber each other's
  // credentials on a shared client (google-auth-library is not concurrency-safe).
  private authFor(tokens: Tokens) {
    const client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri,
    );
    client.setCredentials(tokens);
    return client;
  }

  getAuthUrl(state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: config.google.scopes,
      prompt: "consent",
      state,
    });
  }

  async handleCallback(
    code: string,
  ): Promise<{ tokens: Tokens; user: UserInfo }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();
    const user: UserInfo = {
      email: data.email || "",
      name: data.name || "",
      picture: data.picture || "",
    };

    return { tokens: tokens as Tokens, user };
  }

  async exchangeCodeForTokens(code: string): Promise<{ tokens: Tokens }> {
    // For native app sign-in, exchange the serverAuthCode for tokens
    const { tokens } = await this.oauth2Client.getToken(code);
    return { tokens: tokens as Tokens };
  }

  private getSheetsClient(tokens: Tokens): sheets_v4.Sheets {
    return google.sheets({ version: "v4", auth: this.authFor(tokens) });
  }

  private getDriveClient(tokens: Tokens): drive_v3.Drive {
    return google.drive({ version: "v3", auth: this.authFor(tokens) });
  }

  async create(tokens: Tokens, title: string): Promise<string> {
    const sheets = this.getSheetsClient(tokens);
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
      },
    });
    return response.data.spreadsheetId!;
  }

  async setFileProperties(
    tokens: Tokens,
    fileId: string,
    appProperties: Record<string, string>,
  ): Promise<void> {
    const drive = this.getDriveClient(tokens);
    await drive.files.update({
      fileId,
      requestBody: { appProperties },
    });
  }

  async renameFile(
    tokens: Tokens,
    fileId: string,
    name: string,
  ): Promise<void> {
    const drive = this.getDriveClient(tokens);
    await drive.files.update({
      fileId,
      requestBody: { name },
    });
  }

  async listFiles(
    tokens: Tokens,
    query: string,
  ): Promise<{ id: string; name: string; createdTime: string }[]> {
    const drive = this.getDriveClient(tokens);
    const response = await drive.files.list({
      q: query,
      fields: "files(id, name, createdTime)",
      orderBy: "createdTime desc",
    });

    if (!response.data.files) {
      return [];
    }

    return response.data.files.map((file) => ({
      id: file.id!,
      name: file.name!,
      createdTime: file.createdTime!,
    }));
  }

  async getFileName(tokens: Tokens, fileId: string): Promise<string> {
    const drive = this.getDriveClient(tokens);
    const response = await drive.files.get({
      fileId,
      fields: "name",
    });
    return response.data.name || "";
  }

  async deleteFile(tokens: Tokens, fileId: string): Promise<void> {
    const drive = this.getDriveClient(tokens);
    await drive.files.delete({ fileId });
  }

  async copyFile(
    tokens: Tokens,
    fileId: string,
    name: string,
  ): Promise<string> {
    const drive = this.getDriveClient(tokens);
    const response = await drive.files.copy({
      fileId,
      requestBody: { name },
    });
    return response.data.id!;
  }

  async addSheet(
    tokens: Tokens,
    spreadsheetId: string,
    sheetTitle: string,
  ): Promise<number> {
    const sheets = this.getSheetsClient(tokens);
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: sheetTitle },
            },
          },
        ],
      },
    });
    return response.data.replies![0].addSheet!.properties!.sheetId!;
  }

  async update(
    tokens: Tokens,
    spreadsheetId: string,
    range: string,
    values: (string | number)[][],
  ): Promise<void> {
    const sheets = this.getSheetsClient(tokens);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  }

  async batchUpdate(
    tokens: Tokens,
    spreadsheetId: string,
    data: { range: string; values: (string | number)[][] }[],
  ): Promise<void> {
    const sheets = this.getSheetsClient(tokens);
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: { valueInputOption: "RAW", data },
    });
  }

  async clear(
    tokens: Tokens,
    spreadsheetId: string,
    range: string,
  ): Promise<void> {
    const sheets = this.getSheetsClient(tokens);
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
  }

  async get(
    tokens: Tokens,
    spreadsheetId: string,
    range: string,
  ): Promise<(string | number)[][] | null> {
    const sheets = this.getSheetsClient(tokens);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values || null;
  }

  async getSpreadsheetMetadata(
    tokens: Tokens,
    spreadsheetId: string,
  ): Promise<{ sheetName: string; sheetId: number }> {
    const sheets = this.getSheetsClient(tokens);
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title,sheets.properties.sheetId",
    });
    const properties = response.data.sheets?.[0]?.properties;
    return {
      sheetName: properties?.title || "Sheet1",
      sheetId: properties?.sheetId ?? 0,
    };
  }

  /**
   * Insert a single blank row at the given 1-indexed sheet row position,
   * shifting all rows at or below it down by one. Use `sheets.update()`
   * afterward to fill in the new row's values.
   */
  async insertRow(
    tokens: Tokens,
    spreadsheetId: string,
    sheetId: number,
    rowIndex: number,
  ): Promise<void> {
    const sheets = this.getSheetsClient(tokens);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                // Sheets API ranges are 0-indexed and end-exclusive; a
                // 1-indexed sheet row `rowIndex` sits at array index
                // rowIndex - 1.
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
              inheritFromBefore: false,
            },
          },
        ],
      },
    });
  }

  async appendRows(
    tokens: Tokens,
    spreadsheetId: string,
    range: string,
    values: (string | number)[][],
  ): Promise<void> {
    const sheets = this.getSheetsClient(tokens);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });
  }
}

const googleSheetsPlugin: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  const sheets = new GoogleSheets();
  fastify.decorate("sheets", sheets);
};

export default fp(googleSheetsPlugin, { name: "google-sheets" });

declare module "fastify" {
  interface FastifyInstance {
    sheets: GoogleSheets;
  }
}
