import net from "node:net";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function isPortOpen(port, host = "127.0.0.1", timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeout);
    socket.once("connect", () => {
      status = true;
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("error", () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function main() {
  const dbAlreadyRunning = await isPortOpen(5432);
  let dbProcess = null;

  if (dbAlreadyRunning) {
    console.log("🐘 PostgreSQL database is already running on 127.0.0.1:5432");
  } else {
    console.log("🐘 Starting embedded PostgreSQL database (prisma/pgdata)...");
    const localDbScript = path.resolve(rootDir, "scripts", "local-db.mjs");
    dbProcess = spawn(process.execPath, [localDbScript], {
      stdio: "inherit",
      cwd: rootDir,
      env: process.env,
    });

    dbProcess.on("error", (err) => {
      console.error("❌ Failed to start database process:", err);
    });

    // Wait until database port 5432 is responding
    let connected = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      connected = await isPortOpen(5432);
      if (connected) break;
    }

    if (!connected) {
      console.warn("⚠️ Warning: PostgreSQL on 127.0.0.1:5432 took longer than expected to become ready.");
    } else {
      console.log("✅ Database ready on 127.0.0.1:5432\n");
    }
  }

  console.log("🚀 Starting Next.js development server...");
  const isWindows = process.platform === "win32";
  const nextCmd = isWindows ? "npx.cmd" : "npx";

  const nextProcess = spawn(nextCmd, ["next", "dev", "--webpack"], {
    stdio: "inherit",
    cwd: rootDir,
    shell: isWindows,
    env: process.env,
  });

  const cleanup = () => {
    if (nextProcess && !nextProcess.killed) {
      try {
        nextProcess.kill();
      } catch (e) {}
    }
    if (dbProcess && !dbProcess.killed) {
      try {
        dbProcess.kill();
      } catch (e) {}
    }
    process.exit();
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);

  nextProcess.on("close", (code) => {
    if (dbProcess && !dbProcess.killed) {
      try {
        dbProcess.kill();
      } catch (e) {}
    }
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
