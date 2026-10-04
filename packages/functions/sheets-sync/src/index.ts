import type { HttpFunction } from "@google-cloud/functions-framework";
import * as ff from "@google-cloud/functions-framework";
import { PrismaClient } from "@prisma/client";
import { decryptTokens, encryptTokens } from "./encryption.js";
import { GoogleSheetsClient } from "./sheets.js";

const prisma = new PrismaClient();
const sheetsClient = new GoogleSheetsClient();

function is429Error(error: unknown): boolean {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    return e.code === 429 || e.status === 429;
  }
  return false;
}

const sheetsSync: HttpFunction = async (_req, res) => {
  console.log("Starting sheets sync...");

  try {
    // Query all dirty sheets
    const dirtySheets = await prisma.sheetCache.findMany({
      where: { needsSync: true },
    });

    console.log(`Found ${dirtySheets.length} sheets to sync`);

    let synced = 0;
    let skipped = 0;
    let failed = 0;

    for (const sheet of dirtySheets) {
      try {
        // Get user's encrypted tokens
        const userToken = await prisma.userToken.findUnique({
          where: { userEmail: sheet.userEmail },
        });

        if (!userToken) {
          console.log(`No tokens for user ${sheet.userEmail}, skipping`);
          skipped++;
          continue;
        }

        // Decrypt tokens
        const tokens = decryptTokens(userToken.encryptedTokens);
        if (!tokens) {
          console.log(`Failed to decrypt tokens for ${sheet.userEmail}`);
          skipped++;
          continue;
        }

        // Refresh tokens if expired
        const validTokens = await sheetsClient.refreshTokenIfExpired(tokens);

        // If tokens were refreshed, save the new ones
        if (validTokens.access_token !== tokens.access_token) {
          const newEncryptedTokens = encryptTokens(validTokens);
          await prisma.userToken.update({
            where: { userEmail: sheet.userEmail },
            data: { encryptedTokens: newEncryptedTokens },
          });
        }

        // Sync to Google Sheets
        const data = sheet.data as (string | number)[][];
        await sheetsClient.clearAndWrite(
          validTokens,
          sheet.spreadsheetId,
          data,
        );

        // Mark as synced
        await prisma.sheetCache.update({
          where: { id: sheet.id },
          data: { needsSync: false, lastSyncedAt: new Date() },
        });

        console.log(`Synced ${sheet.spreadsheetId}`);
        synced++;
      } catch (error) {
        if (is429Error(error)) {
          console.log(
            `Rate limited for ${sheet.spreadsheetId}, will retry next run`,
          );
          skipped++;
          continue;
        }

        console.error(`Failed to sync ${sheet.spreadsheetId}:`, error);
        failed++;
      }
    }

    console.log(
      `Sync complete: ${synced} synced, ${skipped} skipped, ${failed} failed`,
    );
    res.status(200).send({ synced, skipped, failed });
  } catch (error) {
    console.error("Sync failed:", error);
    res.status(500).send({ error: "Sync failed" });
  } finally {
    await prisma.$disconnect();
  }
};

ff.http("sheetsSync", sheetsSync);
