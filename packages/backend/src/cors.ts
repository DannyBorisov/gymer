import config from "./config.js";

export const CorsConfig = {
  origin: [
    config.env.FRONTEND_URL,
    "https://gymerr.co",
    "https://www.gymerr.co",
    "capacitor://localhost",
    "ionic://localhost",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};
