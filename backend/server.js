import { createApp } from "./main.js";
import { loadConfig } from "./config.js";
import { createDependencies } from "./dependencies.js";

// This is the process entry point used by npm start/dev. Keep startup separate
// from main.js so importing the app in a test never starts a real server.
const config = loadConfig();
const app = createApp(createDependencies(config));
const server = app.listen(config.port, config.host, () => {
  console.log(`WeTravel API listening on port ${config.port}`);
});
process.on("SIGTERM", () => server.close());
