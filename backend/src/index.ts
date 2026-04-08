import { app } from "./server";
import { config } from "./config/env";
import { testDatabaseConnection } from "./db/pool";
import { ensureAuditTable } from "./services/audit-service";
import { ensureRegistrationSchema } from "./services/schema-service";

async function bootstrap() {
  await testDatabaseConnection();
  await ensureRegistrationSchema();
  await ensureAuditTable();

  app.listen(config.port, () => {
    console.log(`Kingshot Vikings Planner API listening on port ${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
