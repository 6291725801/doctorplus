import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "healthy";
  let dbLatencyMs = 0;
  let storageStatus = "healthy";

  // Test Database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (error) {
    dbStatus = "unhealthy";
    console.error("Health check DB failure:", error);
  }

  // Test Storage subsystem
  try {
    const testBuffer = Buffer.from("health check ping", "utf-8");
    const uploadRes = await storage.uploadFile(
      testBuffer,
      `health_${Date.now()}.txt`,
      "text/plain",
      "health"
    );
    await storage.deleteFile(uploadRes.fileKey);
  } catch (error) {
    storageStatus = "degraded";
    console.warn("Health check Storage warning:", error);
  }

  const memoryUsage = process.memoryUsage();
  const isHealthy = dbStatus === "healthy";

  const responsePayload = {
    status: isHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      storage: {
        status: storageStatus,
        driver: process.env.STORAGE_DRIVER || "local",
      },
      memory: {
        rssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
      },
    },
    meta: {
      nodeEnv: env.NODE_ENV,
      version: "1.0.0",
      responseTimeMs: Date.now() - startTime,
    },
  };

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "application/json",
    },
  });
}
