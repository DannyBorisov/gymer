import type { RouteHandler } from "fastify";
import { getAuthSession } from "../middlewares/auth.js";
import { AppProperties, buildQuery } from "../plugins/googleSheets.js";
import type { SaveBodyWeightRequest } from "../types.js";

const BODY_WEIGHT_SHEET_NAME = "Gymerr Body Weight";

export const getBodyWeight: RouteHandler = async function (request, reply) {
  const { tokens } = getAuthSession(request);

  try {
    const files = await this.sheets.listFiles(tokens, buildQuery("bodyWeight"));

    if (files.length === 0) {
      return { entries: [], spreadsheetId: null };
    }

    const spreadsheetId = files[0].id;
    const data = await this.sheets.get(tokens, spreadsheetId, "Sheet1!A:B");

    if (!data || data.length < 2) {
      return { entries: [], spreadsheetId };
    }

    // Get last 30 entries (most recent first)
    const entries = data
      .slice(1)
      .filter(([date, weight]) => date && weight)
      .map(([date, weight]) => ({ date, weight }))
      .reverse()
      .slice(0, 30);

    return { entries, spreadsheetId };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to fetch body weight" });
  }
};

export const saveBodyWeight: RouteHandler<{
  Body: SaveBodyWeightRequest;
}> = async function (request, reply) {
  const { tokens } = getAuthSession(request);
  const { weight } = request.body;

  if (!weight) {
    return reply.status(400).send({ error: "Weight is required" });
  }

  try {
    // Find or create the body weight sheet
    const files = await this.sheets.listFiles(tokens, buildQuery("bodyWeight"));

    let spreadsheetId: string;
    if (files.length === 0) {
      // Create the sheet
      spreadsheetId = await this.sheets.create(tokens, BODY_WEIGHT_SHEET_NAME);
      const { key, value } = AppProperties.bodyWeight;
      await this.sheets.setFileProperties(tokens, spreadsheetId, {
        [key]: value,
      });
      const headers = [["Date", "Weight"]];
      await this.sheets.update(tokens, spreadsheetId, "Sheet1!A1", headers);
    } else {
      spreadsheetId = files[0].id;
    }

    // Format date as DD/MM/YYYY
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

    // Append the weight entry
    await this.sheets.appendRows(tokens, spreadsheetId, "Sheet1!A:B", [
      [dateStr, weight],
    ]);

    return { success: true, date: dateStr, weight };
  } catch (error) {
    this.log.error(error);
    return reply.status(500).send({ error: "Failed to save body weight" });
  }
};
