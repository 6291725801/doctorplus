import { prisma } from "../src/lib/db";

async function main() {
  const doctors = await prisma.doctor.findMany({
    include: {
      user: true,
      services: { include: { service: true } },
      schedules: true,
    },
  });
  console.log("=== TOTAL DOCTORS:", doctors.length, "===");
  for (const d of doctors) {
    console.log(
      `👨‍⚕️ ${d.user.fullName} | Specialization: ${d.specialization} | Fee: ₹${d.consultationFee} | Active Schedules: ${d.schedules.length}`
    );
  }

  const services = await prisma.service.findMany({
    orderBy: { sortOrder: "asc" },
  });
  console.log("\n=== TOTAL DEPARTMENTS / SERVICES:", services.length, "===");
  for (const s of services) {
    console.log(`🏥 ${s.name} | Fee: ₹${s.fee} | Slug: ${s.slug}`);
  }
}

main().finally(() => prisma.$disconnect());
