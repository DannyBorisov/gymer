import { buildApp } from "./app.js";
import config from "./config.js";

const app = buildApp();

const start = async () => {
  try {
    await app.listen({ port: config.env.PORT, host: "0.0.0.0" });
    console.log(`Server running on http://localhost:${config.env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
