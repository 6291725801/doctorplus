import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { dispatchNotification } from "@/lib/services/notification.service";
import { getActiveClinic } from "@/lib/services/cms.service";
import { providerRegistry } from "@/lib/notifications/registry";
import { MockEmailProvider } from "@/lib/notifications/providers/email.provider";
import { NotificationType, NotificationChannel } from "@prisma/client";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !["SUPER_ADMIN", "CLINIC_ADMIN"].includes(session.role)) {
      return errorResponse("Forbidden: Insufficient privileges", "FORBIDDEN", 403);
    }

    const body = await request.json();
    const event = (body.event || NotificationType.APPOINTMENT_BOOKED) as NotificationType;
    const channel = (body.channel || NotificationChannel.EMAIL) as NotificationChannel;
    const recipientEmail = body.recipientEmail || session.email;
    const recipientPhone = body.recipientPhone || "+91 9876543210";
    const simulateFailure = Boolean(body.simulateFailure);

    const clinic = await getActiveClinic();
    const clinicId = session.clinicId || clinic?.id;

    // Handle failure simulation for testing failure resilience
    const emailProvider = providerRegistry.getEmailProvider();
    if (emailProvider instanceof MockEmailProvider) {
      emailProvider.simulateFailure = simulateFailure;
      if (simulateFailure) {
        emailProvider.failureErrorMessage = "Simulated SMTP connection timeout (ETIMEDOUT)";
      }
    }

    const testVariables = {
      patientName: body.patientName || session.fullName || "Test Patient",
      patientEmail: recipientEmail,
      patientPhone: recipientPhone,
      doctorName: "Dr. Vikram Seth",
      doctorSpecialization: "Ayurvedic Medicine",
      clinicName: clinic?.name || "AyurvedaCare Clinic",
      clinicPhone: clinic?.phone || "+91 9876543210",
      clinicAddress: clinic?.address || "123 Wellness Way, Civil Lines",
      appointmentNumber: "APT-TEST-001",
      appointmentDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      appointmentTime: "10:30",
      appointmentType: "IN_PERSON",
      amount: "500.00",
      paymentMethod: "UPI",
      transactionId: "TXN_MOCK_12345",
      receiptNumber: "REC-TEST-99",
      cancellationReason: "Patient schedule adjustment",
      scheduleChangeDetails: "Doctor available 11:00 AM to 5:00 PM on weekdays",
      notes: "Please carry prior test reports",
      link: "/dashboard/patient",
    };

    const results = await dispatchNotification({
      event,
      recipient: {
        name: testVariables.patientName,
        email: recipientEmail,
        phone: recipientPhone,
        userId: session.userId,
      },
      variables: testVariables,
      channels: [channel],
      clinicId,
      metadata: { testDispatch: true, simulatedFailure: simulateFailure },
    });

    // Reset failure simulation on mock provider
    if (emailProvider instanceof MockEmailProvider && simulateFailure) {
      emailProvider.simulateFailure = false;
    }

    return successResponse({
      event,
      channel,
      recipient: channel === NotificationChannel.EMAIL ? recipientEmail : recipientPhone,
      results,
    }, "Notification test dispatch completed");
  } catch (error) {
    return handleApiError(error);
  }
}
