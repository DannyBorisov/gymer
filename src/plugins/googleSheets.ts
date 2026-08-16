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

export class GoogleSheets {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri,
    );
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

  private getSheetsClient(tokens: Tokens): sheets_v4.Sheets {
    this.oauth2Client.setCredentials(tokens);
    return google.sheets({ version: "v4", auth: this.oauth2Client });
  }

  private getDriveClient(tokens: Tokens): drive_v3.Drive {
    this.oauth2Client.setCredentials(tokens);
    return google.drive({ version: "v3", auth: this.oauth2Client });
  }

  async createSpreadsheet(tokens: Tokens, title: string): Promise<string> {
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
      requestBody: {
        valueInputOption: "RAW",
        data,
      },
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
}

declare module "fastify" {
  interface FastifyInstance {
    sheets: GoogleSheets;
  }
}

const googleSheetsPlugin: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  const sheets = new GoogleSheets();
  fastify.decorate("sheets", sheets);
};

export default fp(googleSheetsPlugin, { name: "google-sheets" });
