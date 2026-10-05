import { prisma } from "../src/lib/db";

async function main() {
  const clinic = await prisma.clinic.findFirst();
  if (!clinic) {
    console.error("No clinic found!");
    process.exit(1);
  }

  const updatedClinic = await prisma.clinic.update({
    where: { id: clinic.id },
    data: {
      name: "Doctor Plus",
      description: "Advanced medical care, specialized therapies, and certified doctor consultations.",
      email: "care@doctorplus.com",
      address: "Keutia, Bhatpara, Kolkata",
      city: "Bhatpara",
      state: "West Bengal",
      postalCode: "743126",
      country: "India",
    },
  });

  const mapEmbedUrl =
    "https://maps.google.com/maps?q=Keutia,+Bhatpara,+Kolkata+743126&t=&z=15&ie=UTF8&iwloc=&output=embed";

  const siteSettings = await prisma.siteSettings.upsert({
    where: { clinicId: clinic.id },
    create: {
      clinicId: clinic.id,
      siteTitle: "Doctor Plus",
      tagline: "Advanced Healthcare & Specialized Clinical Services",
      metaDescription: "Doctor Plus - Book verified doctor appointments and clinical consultations in Keutia, Bhatpara, Kolkata.",
      logoUrl: "/doctor-plus-icon.svg",
      faviconUrl: "/doctor-plus-icon.svg",
      contactEmail: "care@doctorplus.com",
      contactPhone: "+91 98765 43210",
      whatsappNumber: "+919876543210",
      address: "Keutia, Bhatpara, Kolkata, West Bengal 743126",
      mapEmbedUrl,
      footerConfig: {
        copyright: "© 2026 Doctor Plus. All rights reserved.",
        disclaimer: "Doctor Plus provides accredited clinical healthcare and verified doctor consultations.",
      },
      headerConfig: {
        announcement: "🏥 Welcome to Doctor Plus — Specialized Healthcare & Expert Consultations",
        showTopBanner: true,
      },
    },
    update: {
      siteTitle: "Doctor Plus",
      tagline: "Advanced Healthcare & Specialized Clinical Services",
      metaDescription: "Doctor Plus - Book verified doctor appointments and clinical consultations in Keutia, Bhatpara, Kolkata.",
      logoUrl: "/doctor-plus-icon.svg",
      faviconUrl: "/doctor-plus-icon.svg",
      contactEmail: "care@doctorplus.com",
      address: "Keutia, Bhatpara, Kolkata, West Bengal 743126",
      mapEmbedUrl,
      footerConfig: {
        copyright: "© 2026 Doctor Plus. All rights reserved.",
        disclaimer: "Doctor Plus provides accredited clinical healthcare and verified doctor consultations.",
      },
      headerConfig: {
        announcement: "🏥 Welcome to Doctor Plus — Specialized Healthcare & Expert Consultations",
        showTopBanner: true,
      },
    },
  });

  console.log("Updated clinic:", updatedClinic.name);
  console.log("Updated site settings:", siteSettings.siteTitle, siteSettings.logoUrl);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
