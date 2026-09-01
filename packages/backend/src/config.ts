import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";

export enum NodeEnv {
  Development = "development",
  Production = "production",
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const EnvSchema = z.object({
  NODE_ENV: z.enum([NodeEnv.Development, NodeEnv.Production]),
  PORT: z.coerce.number().default(3002),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string(),
  SESSION_SECRET: z.string().min(32),
  FIREBASE_SERVICE_ACCOUNT: z.string(),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  FIRESTORE_DATABASE_ID: z.string().default("default"),
  GOOGLE_CLOUD_PROJECT_ID: z.string(),
  GOOGLE_CLOUD_LOCATION: z.string().default("global"),
  GOOGLE_GEMINI_API_KEY: z.string(),
});

const env = EnvSchema.parse(process.env);

const config = {
  env,
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  },
};

export default config;
