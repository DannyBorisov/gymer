import config from "./config.js";

export default {
  origin: [
    config.env.FRONTEND_URL,
    "https://ikkos.co",
    "https://www.ikkos.co",
    "capacitor://localhost",
    "ionic://localhost",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};
