import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith("--")) {
        parsed[key] = nextArg;
        i++;
      } else {
        parsed[key] = "true";
      }
    }
  }

  return parsed;
}

function generateSecurePassword(): string {
  // Generates 16-character secure random password with upper, lower, number, special char
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghijkmnpqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%^&*";

  const all = uppercase + lowercase + numbers + special;
  let pass = "";
  pass += uppercase[crypto.randomInt(uppercase.length)];
  pass += lowercase[crypto.randomInt(lowercase.length)];
  pass += numbers[crypto.randomInt(numbers.length)];
  pass += special[crypto.randomInt(special.length)];

  for (let i = 4; i < 16; i++) {
    pass += all[crypto.randomInt(all.length)];
  }

  return pass
    .split("")
    .sort(() => crypto.randomInt(3) - 1)
    .join("");
}

async function main() {
  const cliArgs = parseArgs();

  const email = (
    cliArgs.email ||
    process.env.ADMIN_EMAIL ||
    "admin@clinicplatform.internal"
  ).toLowerCase().trim();

  const fullName = (
    cliArgs.name ||
    process.env.ADMIN_NAME ||
    "System Administrator"
  ).trim();

  const roleInput = (
    cliArgs.role ||
    process.env.ADMIN_ROLE ||
    "SUPER_ADMIN"
  ).toUpperCase() as UserRole;

  const validRoles: UserRole[] = [
    "SUPER_ADMIN",
    "CLINIC_ADMIN",
    "CONTENT_MANAGER",
    "DOCTOR",
    "RECEPTIONIST",
  ];

  if (!validRoles.includes(roleInput)) {
    console.error(`❌ Invalid role: "${roleInput}". Must be one of: ${validRoles.join(", ")}`);
    process.exit(1);
  }

  // Find or generate secure password
  let plainPassword = cliArgs.password || process.env.ADMIN_INITIAL_PASSWORD;
  let wasGenerated = false;

  if (!plainPassword) {
    plainPassword = generateSecurePassword();
    wasGenerated = true;
  }

  if (plainPassword.length < 8) {
    console.error("❌ Password must be at least 8 characters long.");
    process.exit(1);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`⚠️ User with email "${email}" already exists (Role: ${existingUser.role}).`);
    const updateChoice = cliArgs.update === "true";
    if (!updateChoice) {
      console.log("To update this existing user's password/role, pass `--update true`.");
      process.exit(0);
    }
  }

  const defaultClinic = await prisma.clinic.findFirst({
    where: { isActive: true },
  });

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      fullName,
      role: roleInput,
      passwordHash,
      isActive: true,
      clinicId: roleInput === "SUPER_ADMIN" ? null : defaultClinic?.id || null,
    },
    create: {
      email,
      fullName,
      role: roleInput,
      passwordHash,
      isActive: true,
      clinicId: roleInput === "SUPER_ADMIN" ? null : defaultClinic?.id || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      clinicId: user.clinicId,
      action: "ADMIN_USER_INITIALIZED",
      entity: "User",
      entityId: user.id,
      metadata: { role: user.role, email: user.email },
    },
  });

  console.log("==================================================");
  console.log("✅ Administrative User Successfully Configured");
  console.log("==================================================");
  console.log(`User ID : ${user.id}`);
  console.log(`Name    : ${user.fullName}`);
  console.log(`Email   : ${user.email}`);
  console.log(`Role    : ${user.role}`);
  console.log(`Clinic  : ${user.clinicId || "Global (Super Admin)"}`);

  if (wasGenerated) {
    console.log("\n🔑 GENERATED ONE-TIME CREDENTIALS:");
    console.log("--------------------------------------------------");
    console.log(`Password: ${plainPassword}`);
    console.log("--------------------------------------------------");
    console.log("⚠️ Copy this password immediately. It is never stored in plain text.");
  } else {
    console.log("\n🔑 Password securely hashed with bcrypt (salt rounds = 12).");
  }
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("❌ Failed to initialize admin:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
