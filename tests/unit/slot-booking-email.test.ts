import { describe, it, expect, beforeEach } from "vitest";
import { sendAppointmentBookedNotification } from "@/lib/services/notification.service";
import { providerRegistry } from "@/lib/notifications/registry";
import { MockEmailProvider } from "@/lib/notifications/providers/email.provider";
import { prisma } from "@/lib/db";

describe("Slot Booking Email Dual Dispatch Flow", () => {
  let mockEmail: MockEmailProvider;

  beforeEach(() => {
    mockEmail = new MockEmailProvider();
    providerRegistry.setEmailProvider(mockEmail);
  });

  it("dispatches booking notification to both patient and admin rohitkumar725801@gmail.com", async () => {
    // Find an existing appointment
    const appointment = await prisma.appointment.findFirst({
      include: { patientProfile: { include: { user: true } } },
    });

    if (!appointment) return;

    await sendAppointmentBookedNotification(appointment.id);

    // Verify patient received email
    const patientEmail = appointment.patientProfile?.user?.email;
    if (patientEmail && patientEmail !== "rohitkumar725801@gmail.com") {
      const pMail = mockEmail.sentEmails.find((e) => e.to === patientEmail);
      expect(pMail).toBeDefined();
    }

    // Verify rohitkumar725801@gmail.com received admin alert email
    const adminMail = mockEmail.sentEmails.find((e) => e.to === "rohitkumar725801@gmail.com");
    expect(adminMail).toBeDefined();
    expect(adminMail?.subject).toContain("New Slot Booked");
    expect(adminMail?.html).toContain("New Slot Booked Successfully");
  });
});
