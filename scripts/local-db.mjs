import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import path from "path";
import fs from "fs";

const dataDir = path.resolve(process.cwd(), "prisma/pgdata");
const pidFile = path.join(dataDir, "postmaster.pid");

// Clean up stale postmaster.pid left over from previous abruptly terminated sessions
if (fs.existsSync(pidFile)) {
  try {
    fs.unlinkSync(pidFile);
  } catch (err) {
    // Ignore if file cannot be removed
  }
}

console.log(`Initializing embedded PostgreSQL database in ${dataDir}...`);

const db = new PGlite(dataDir);
await db.waitReady;

const server = new PGLiteSocketServer({
  db,
  port: 5432,
  host: "127.0.0.1",
  maxConnections: 500,
});

await server.start();
console.log("==================================================");
console.log("🐘 Local PostgreSQL server listening on 127.0.0.1:5432");
console.log("📁 Data directory: prisma/pgdata");
console.log("==================================================");

const shutdown = async () => {
  console.log("\nShutting down local PostgreSQL server...");
  try {
    await server.stop();
    await db.close();
  } catch (e) {
    // Ignore shutdown errors
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

