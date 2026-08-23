const app = require("./app");
const { env } = require("./config/env");
const { connectDb } = require("./config/db");

async function start() {
  await connectDb();
  app.listen(env.PORT, () => console.log(`Nestora API listening on port ${env.PORT}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error("Unable to start server", error);
    process.exit(1);
  });
}

module.exports = app;
