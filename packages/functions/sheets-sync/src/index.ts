import type { HttpFunction } from "@google-cloud/functions-framework";
import * as ff from "@google-cloud/functions-framework";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import type { Bucket } from "@google-cloud/storage";
import { PrismaClient } from "@prisma/client";
import { decryptTokens, encryptTokens } from "./encryption.js";
import { GoogleSheetsClient } from "./sheets.js";

function initFirebase(): Bucket {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
  const storage = getStorage();
  return storage.bucket(process.env.FIREBASE_STORAGE_BUCKET);
}

const prisma = new PrismaClient();
const sheetsClient = new GoogleSheetsClient();

interface SheetMetadata {
  id: string;
  name: string;
  createdTime: string;
  appProperties?: Record<string, string>;
}

interface SheetIndex {
  sheets: SheetMetadata[];
}

function is429Error(error: unknown): boolean {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    return e.code === 429 || e.status === 429;
  }
  return false;
}

/**
 * Get all user directories from Firebase Storage
 */
async function getAllUsers(bucket: Bucket): Promise<string[]> {
  const [files] = await bucket.getFiles({ prefix: "users/" });
  const userEmails = new Set<string>();

  for (const file of files) {
    // Path: users/{email}/sheets/{name}.json
    const parts = file.name.split("/");
    if (parts.length >= 2) {
      // Convert safe email back to original format
      const safeEmail = parts[1];
      const email = safeEmail.replace(/_at_/g, "@").replace(/_/g, ".");
      userEmails.add(email);
    }
  }

  return Array.from(userEmails);
}

/**
 * Get sheet index for a user
 */
async function getSheetIndex(bucket: Bucket, userEmail: string): Promise<SheetIndex> {
  const safeEmail = userEmail.replace(/@/g, "_at_").replace(/\./g, "_");
  const indexPath = `users/${safeEmail}/sheets/_index.json`;

  try {
    const file = bucket.file(indexPath);
    const [exists] = await file.exists();
    if (!exists) return { sheets: [] };

    const [content] = await file.download();
    return JSON.parse(content.toString());
  } catch {
    return { sheets: [] };
  }
}

/**
 * Get sheet data from Firebase Storage
 */
async function getSheetData(
  bucket: Bucket,
  userEmail: string,
  sheetId: string,
): Promise<(string | number)[][] | null> {
  const safeEmail = userEmail.replace(/@/g, "_at_").replace(/\./g, "_");
  const filePath = `users/${safeEmail}/sheets/${sheetId}.json`;

  try {
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) return null;

    const [content] = await file.download();
    return JSON.parse(content.toString());
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

const sheetsSync: HttpFunction = async (_req, res) => {
  console.log("Starting Firebase → Google Sheets sync...");

  try {
    // Initialize Firebase and get bucket
    const bucket = initFirebase();

    // Get all users from Firebase Storage
    const userEmails = await getAllUsers(bucket);
    console.log(`Found ${userEmails.length} users`);

    let synced = 0;
    let skipped = 0;
    let failed = 0;

    for (const userEmail of userEmails) {
      try {
        // Get user's encrypted tokens from database
        const userToken = await prisma.userToken.findUnique({
          where: { userEmail },
        });

        if (!userToken) {
          console.log(`No tokens for user ${userEmail}, skipping`);
          skipped++;
          continue;
        }

        // Decrypt tokens
        const tokens = decryptTokens(userToken.encryptedTokens);
        if (!tokens) {
          console.log(`Failed to decrypt tokens for ${userEmail}`);
          skipped++;
          continue;
        }

        // Refresh tokens if expired
        const validTokens = await sheetsClient.refreshTokenIfExpired(tokens);

        // If tokens were refreshed, save the new ones
        if (validTokens.access_token !== tokens.access_token) {
          const newEncryptedTokens = encryptTokens(validTokens);
          await prisma.userToken.update({
            where: { userEmail },
            data: { encryptedTokens: newEncryptedTokens },
          });
        }

        // Get sheet index for this user
        const index = await getSheetIndex(bucket, userEmail);
        console.log(`User ${userEmail} has ${index.sheets.length} sheets`);

        // Sync each sheet to Google Sheets
        for (const sheet of index.sheets) {
          try {
            const data = await getSheetData(bucket, userEmail, sheet.id);
            if (!data) {
              console.log(`No data for sheet ${sheet.id}, skipping`);
              continue;
            }

            // Get or create Google Sheet for this data
            // The sheet.id in Firebase corresponds to the Google Sheet ID
            // For programs, this is the spreadsheetId
            // For quick-workouts/body-weight, we need to find/create the sheet

            let spreadsheetId = sheet.id;

            // Check if this is a known sheet type that needs special handling
            if (sheet.id === "quick-workouts" || sheet.id === "body-weight") {
              // These are special sheets - find or create them
              spreadsheetId = await sheetsClient.findOrCreateSheet(
                validTokens,
                sheet.name,
                sheet.appProperties || {},
              );
            }

            // Write data to Google Sheets
            await sheetsClient.clearAndWrite(validTokens, spreadsheetId, data);
            console.log(`Synced ${sheet.name} (${spreadsheetId})`);
            synced++;
          } catch (error) {
            if (is429Error(error)) {
              console.log(`Rate limited for ${sheet.id}, will retry next run`);
              skipped++;
              continue;
            }
            console.error(`Failed to sync sheet ${sheet.id}:`, error);
            failed++;
          }
        }
      } catch (error) {
        console.error(`Failed to process user ${userEmail}:`, error);
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
