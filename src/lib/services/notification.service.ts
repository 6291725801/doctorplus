import { prisma } from "@/lib/db";
import { NotificationType, NotificationChannel, NotificationDeliveryStatus } from "@prisma/client";
import { providerRegistry } from "../notifications/registry";
import {
  DEFAULT_NOTIFICATION_TEMPLATES,
  renderTemplate,
  DefaultTemplateDefinition,
} from "../notifications/templates/default-templates";
import {
  NotificationPayload,
  NotificationResult,
  NotificationVariables,
} from "../notifications/types";

/**
 * Ensures default notification templates exist for a clinic.
 */
export async function seedDefaultTemplates(clinicId?: string): Promise<void> {
  const targetClinicId = clinicId || (await prisma.clinic.findFirst({ select: { id: true } }))?.id;

  for (const def of DEFAULT_NOTIFICATION_TEMPLATES) {
    const existing = await prisma.notificationTemplate.findFirst({
      where: {
        clinicId: targetClinicId || null,
        event: def.event,
        channel: def.channel,
      },
    });

    if (!existing) {
      await prisma.notificationTemplate.create({
        data: {
          clinicId: targetClinicId || null,
          event: def.event,
          channel: def.channel,
          name: def.name,
          subject: def.subject || null,
          body: def.body,
          isActive: true,
          variables: def.variables,
          description: def.description,
        },
      });
    }
  }
}

/**
 * Retrieves all notification templates for a clinic.
 */
export async function getNotificationTemplates(clinicId?: string) {
  let templates = await prisma.notificationTemplate.findMany({
    where: clinicId ? { clinicId } : undefined,
    orderBy: [{ event: "asc" }, { channel: "asc" }],
  });

  if (templates.length === 0) {
    await seedDefaultTemplates(clinicId);
    templates = await prisma.notificationTemplate.findMany({
      where: clinicId ? { clinicId } : undefined,
      orderBy: [{ event: "asc" }, { channel: "asc" }],
    });
  }

  return templates;
}

/**
 * Updates a notification template (from CMS/Admin).
 */
export async function updateNotificationTemplate(
  id: string,
  data: {
    subject?: string;
    body: string;
    isActive?: boolean;
    name?: string;
  }
) {
  return prisma.notificationTemplate.update({
    where: { id },
    data: {
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.body !== undefined && { body: data.body }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.name !== undefined && { name: data.name }),
    },
  });
}

/**
 * Resets a notification template back to the system default content.
 */
export async function resetNotificationTemplate(id: string) {
  const current = await prisma.notificationTemplate.findUnique({ where: { id } });
  if (!current) throw new Error("Template not found");

  const def = DEFAULT_NOTIFICATION_TEMPLATES.find(
    (d) => d.event === current.event && d.channel === current.channel
  );

  if (!def) throw new Error("No default template available for this event and channel");

  return prisma.notificationTemplate.update({
    where: { id },
    data: {
      name: def.name,
      subject: def.subject || null,
      body: def.body,
      isActive: true,
    },
  });
}

/**
 * Core notification dispatcher with resilient failure handling and audit logging.
 * Guarantees non-blocking execution: errors are captured and logged without throwing.
 */
export async function dispatchNotification(payload: NotificationPayload): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];
  const channels = payload.channels || [NotificationChannel.EMAIL];

  // In-app notification creation if user ID exists
  if (payload.recipient.userId) {
    try {
      const inAppTitle = payload.variables.appointmentNumber
        ? `${payload.event.replace(/_/g, " ")} (#${payload.variables.appointmentNumber})`
        : payload.event.replace(/_/g, " ");

      const inAppMessage =
        payload.variables.notes ||
        payload.variables.cancellationReason ||
        payload.variables.scheduleChangeDetails ||
        `Notification for ${payload.event} at ${payload.variables.clinicName || "Clinic"}`;

      await prisma.notification.create({
        data: {
          userId: payload.recipient.userId,
          title: inAppTitle,
          message: inAppMessage,
          type: payload.event,
          link: payload.variables.link || `/dashboard/patient/appointments`,
        },
      });
    } catch {
      // In-app notifications are non-critical; connection drops are gracefully absorbed
    }
  }

  for (const channel of channels) {
    let templateSubject = "";
    let templateBody = "";
    let templateId: string | null = null;
    let isActive = true;

    // 1. Resolve template from DB
    try {
      const dbTemplate = await prisma.notificationTemplate.findFirst({
        where: {
          event: payload.event,
          channel,
          ...(payload.clinicId ? { clinicId: payload.clinicId } : {}),
        },
      });

      if (dbTemplate) {
        templateId = dbTemplate.id;
        templateSubject = dbTemplate.subject || "";
        templateBody = dbTemplate.body;
        isActive = dbTemplate.isActive;
      } else {
        // Fallback to in-memory default
        const def = DEFAULT_NOTIFICATION_TEMPLATES.find(
          (d) => d.event === payload.event && d.channel === channel
        );
        if (def) {
          templateSubject = def.subject || "";
          templateBody = def.body;
        }
      }
    } catch (err) {
      console.warn("[NotificationService] Failed reading template from database, using fallback default.");
      const def = DEFAULT_NOTIFICATION_TEMPLATES.find(
        (d) => d.event === payload.event && d.channel === channel
      );
      if (def) {
        templateSubject = def.subject || "";
        templateBody = def.body;
      }
    }

    if (!isActive || !templateBody) {
      continue;
    }

    // 2. Render placeholders
    const renderedSubject = renderTemplate(templateSubject, payload.variables);
    const renderedBody = renderTemplate(templateBody, payload.variables);
    let targetRecipient = "";
    let providerName = "";
    let dispatchSuccess = false;
    let providerMessageId: string | undefined;
    let dispatchError: string | undefined;

    // 3. Dispatch via appropriate provider
    try {
      if (channel === NotificationChannel.EMAIL) {
        targetRecipient = payload.recipient.email || "";
        const emailProvider = providerRegistry.getEmailProvider();
        providerName = emailProvider.name;

        if (!targetRecipient) {
          throw new Error("Recipient has no valid email address provided.");
        }

        const res = await emailProvider.sendEmail({
          to: targetRecipient,
          subject: renderedSubject || `Notification from ${payload.variables.clinicName || "Clinic"}`,
          html: renderedBody,
          text: renderedBody.replace(/<[^>]*>?/gm, ""),
        });

        dispatchSuccess = res.success;
        providerMessageId = res.messageId;
        dispatchError = res.error;
      } else if (channel === NotificationChannel.SMS) {
        targetRecipient = payload.recipient.phone || "";
        const smsProvider = providerRegistry.getSmsProvider();
        providerName = smsProvider.name;

        if (!targetRecipient) {
          throw new Error("Recipient has no valid phone number provided for SMS.");
        }

        const res = await smsProvider.sendSms({
          to: targetRecipient,
          message: renderedBody,
        });

        dispatchSuccess = res.success;
        providerMessageId = res.messageId;
        dispatchError = res.error;
      } else if (channel === NotificationChannel.WHATSAPP) {
        targetRecipient = payload.recipient.phone || "";
        const waProvider = providerRegistry.getWhatsAppProvider();
        providerName = waProvider.name;

        if (!targetRecipient) {
          throw new Error("Recipient has no valid phone number provided for WhatsApp.");
        }

        const res = await waProvider.sendWhatsApp({
          to: targetRecipient,
          message: renderedBody,
        });

        dispatchSuccess = res.success;
        providerMessageId = res.messageId;
        dispatchError = res.error;
      }
    } catch (err: any) {
      dispatchSuccess = false;
      dispatchError = err.message || "Unknown dispatch exception occurred";
    }

    // 4. Record Notification Log (Failure resilience guaranteed)
    let logRecord: any = null;
    try {
      logRecord = await prisma.notificationLog.create({
        data: {
          clinicId: payload.clinicId || null,
          userId: payload.recipient.userId || null,
          templateId: templateId || null,
          event: payload.event,
          channel,
          recipient: targetRecipient || payload.recipient.name || "Unknown",
          subject: renderedSubject || null,
          content: renderedBody,
          status: dispatchSuccess
            ? NotificationDeliveryStatus.SENT
            : NotificationDeliveryStatus.FAILED,
          provider: providerName || "None",
          providerMessageId: providerMessageId || null,
          errorMessage: dispatchError || null,
          sentAt: dispatchSuccess ? new Date() : null,
          metadata: payload.metadata || {},
        },
      });
    } catch (logErr: any) {
      console.error("[NotificationService] Failed to persist NotificationLog:", logErr.message);
    }

    results.push({
      success: dispatchSuccess,
      channel,
      provider: providerName,
      recipient: targetRecipient,
      subject: renderedSubject,
      content: renderedBody,
      providerMessageId,
      errorMessage: dispatchError,
      logId: logRecord?.id,
    });
  }

  return results;
}

// ==========================================
// HIGH-LEVEL TRIGGERING FUNCTIONS (7 EVENTS)
// ==========================================

/**
 * 1. Event: APPOINTMENT_BOOKED
 */
export async function sendAppointmentBookedNotification(
  appointmentId: string,
  customChannels?: NotificationChannel[]
): Promise<NotificationResult[]> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        clinic: { include: { siteSettings: true } },
        doctor: { include: { user: true } },
        patientProfile: { include: { user: true } },
        service: true,
      },
    });

    if (!appt) return [];

    const variables: NotificationVariables = {
      patientName: appt.patientProfile?.user?.fullName || "Patient",
      patientEmail: appt.patientProfile?.user?.email,
      patientPhone: appt.patientProfile?.user?.phone,
      doctorName: appt.doctor?.user?.fullName || "Doctor",
      doctorSpecialization: appt.doctor?.specialization || "General Practice",
      clinicName: appt.clinic?.name || "Doctor Plus",
      clinicPhone: appt.clinic?.siteSettings?.contactPhone || appt.clinic?.phone || "+91 9876543210",
      clinicAddress: appt.clinic?.address || "Main Clinic Road",
      clinicSlug: appt.clinic?.slug,
      appointmentNumber: appt.appointmentNumber,
      appointmentDate: appt.appointmentDate.toISOString().slice(0, 10),
      appointmentTime: appt.appointmentTime,
      appointmentType: appt.appointmentType,
      serviceName: appt.service?.name || "Consultation",
      amount: Number(appt.consultationFee).toFixed(2),
      link: `/dashboard/patient/appointments/${appt.id}`,
    };

    // 1. Dispatch to Patient
    const results = await dispatchNotification({
      event: NotificationType.APPOINTMENT_BOOKED,
      recipient: {
        name: variables.patientName || "Patient",
        email: variables.patientEmail || undefined,
        phone: variables.patientPhone || undefined,
        userId: appt.patientProfile?.userId,
      },
      variables,
      channels: customChannels || [NotificationChannel.EMAIL],
      clinicId: appt.clinicId,
      metadata: { appointmentId: appt.id },
    });

    // 2. Dispatch dedicated Slot Booking Notification to Admin (Rohit Kumar)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "rohitkumar725801@gmail.com";
    if (adminEmail && adminEmail.toLowerCase() !== (variables.patientEmail || "").toLowerCase()) {
      const emailProvider = providerRegistry.getEmailProvider();
      const adminMailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #0d9488; padding: 16px 20px; border-radius: 8px; color: #ffffff; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 20px;">🎉 New Slot Booked Successfully!</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Appointment Booking Alert</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 140px;"><strong>Appointment No:</strong></td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${variables.appointmentNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Patient Name:</strong></td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${variables.patientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Patient Email:</strong></td>
              <td style="padding: 8px 0; color: #0f172a;"><a href="mailto:${variables.patientEmail}" style="color: #0d9488;">${variables.patientEmail || "N/A"}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Patient Phone:</strong></td>
              <td style="padding: 8px 0; color: #0f172a;">${variables.patientPhone || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Assigned Doctor:</strong></td>
              <td style="padding: 8px 0; color: #0f172a;">${variables.doctorName} (${variables.doctorSpecialization})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Date & Time Slot:</strong></td>
              <td style="padding: 8px 0; color: #0d9488; font-weight: bold;">${variables.appointmentDate} at ${variables.appointmentTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Service:</strong></td>
              <td style="padding: 8px 0; color: #0f172a;">${variables.serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Consultation Fee:</strong></td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">₹${variables.amount}</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/admin" style="background-color: #0d9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Open Admin Dashboard
            </a>
          </div>

          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            This email was sent to notify you of a new clinic booking on ${variables.clinicName}.
          </p>
        </div>
      `;

      const adminMailText = `
New Slot Booked:
----------------
Appointment No: ${variables.appointmentNumber}
Patient: ${variables.patientName} (${variables.patientEmail || "No email"}, ${variables.patientPhone || "No phone"})
Doctor: ${variables.doctorName} (${variables.doctorSpecialization})
Date & Time: ${variables.appointmentDate} at ${variables.appointmentTime}
Service: ${variables.serviceName} (Fee: ₹${variables.amount})
Clinic: ${variables.clinicName}
Dashboard: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/admin
      `.trim();

      emailProvider
        .sendEmail({
          to: adminEmail,
          subject: `📅 New Slot Booked: ${variables.appointmentNumber} - ${variables.patientName} (${variables.appointmentDate} ${variables.appointmentTime})`,
          text: adminMailText,
          html: adminMailHtml,
        })
        .catch((e) => console.error("[NotificationService] Admin slot booking email failed:", e));
    }

    return results;
  } catch (err: any) {
    console.error("[NotificationService] sendAppointmentBookedNotification failed:", err.message);
    return [];
  }
}

/**
 * 2. Event: PAYMENT_SUCCESSFUL
 */
export async function sendPaymentSuccessfulNotification(
  paymentId: string,
  customChannels?: NotificationChannel[]
): Promise<NotificationResult[]> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        appointment: {
          include: {
            clinic: { include: { siteSettings: true } },
            doctor: { include: { user: true } },
            patientProfile: { include: { user: true } },
          },
        },
      },
    });

    if (!payment || !payment.appointment) return [];
    const appt = payment.appointment;

    const variables: NotificationVariables = {
      patientName: appt.patientProfile?.user?.fullName || "Patient",
      patientEmail: appt.patientProfile?.user?.email,
      patientPhone: appt.patientProfile?.user?.phone,
      doctorName: appt.doctor?.user?.fullName || "Doctor",
      clinicName: appt.clinic?.name || "Doctor Plus",
      appointmentNumber: appt.appointmentNumber,
      amount: Number(payment.amount).toFixed(2),
      paymentMethod: payment.method,
      paymentStatus: payment.status,
      transactionId: payment.gatewayPaymentId || payment.id,
      receiptNumber: `REC-${payment.id.slice(-6).toUpperCase()}`,
      link: `/dashboard/patient/appointments/${appt.id}`,
    };

    // 1. Dispatch to Patient
    const results = await dispatchNotification({
      event: NotificationType.PAYMENT_SUCCESSFUL,
      recipient: {
        name: variables.patientName || "Patient",
        email: variables.patientEmail || undefined,
        phone: variables.patientPhone || undefined,
        userId: appt.patientProfile?.userId,
      },
      variables,
      channels: customChannels || [NotificationChannel.EMAIL],
      clinicId: appt.clinicId,
      metadata: { appointmentId: appt.id, paymentId: payment.id },
    });

    // 2. Dispatch Payment Alert to Admin (Rohit Kumar)
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "rohitkumar725801@gmail.com";
    if (adminEmail && adminEmail.toLowerCase() !== (variables.patientEmail || "").toLowerCase()) {
      const emailProvider = providerRegistry.getEmailProvider();
      const paymentText = `Payment of ₹${variables.amount} received via ${variables.paymentMethod} from ${variables.patientName} for appointment ${variables.appointmentNumber}.`;
      emailProvider
        .sendEmail({
          to: adminEmail,
          subject: `💳 Payment Received: ₹${variables.amount} for Appt ${variables.appointmentNumber} (${variables.patientName})`,
          text: paymentText,
          html: `<p>${paymentText}</p>`,
        })
        .catch((e) => console.error("[NotificationService] Admin payment email failed:", e));
    }

    return results;
  } catch (err: any) {
    console.error("[NotificationService] sendPaymentSuccessfulNotification failed:", err.message);
    return [];
  }
}

/**
 * 3. Event: APPOINTMENT_CANCELLED
 */
export async function sendAppointmentCancelledNotification(
  appointmentId: string,
  cancellationReason?: string,
  customChannels?: NotificationChannel[]
): Promise<NotificationResult[]> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        clinic: { include: { siteSettings: true } },
        doctor: { include: { user: true } },
        patientProfile: { include: { user: true } },
      },
    });

    if (!appt) return [];

    const variables: NotificationVariables = {
      patientName: appt.patientProfile?.user?.fullName || "Patient",
      patientEmail: appt.patientProfile?.user?.email,
      patientPhone: appt.patientProfile?.user?.phone,
      doctorName: appt.doctor?.user?.fullName || "Doctor",
      clinicName: appt.clinic?.name || "Doctor Plus",
      clinicPhone: appt.clinic?.siteSettings?.contactPhone || appt.clinic?.phone || "+91 9876543210",
      appointmentNumber: appt.appointmentNumber,
      appointmentDate: appt.appointmentDate.toISOString().slice(0, 10),
      appointmentTime: appt.appointmentTime,
      cancellationReason: cancellationReason || appt.cancellationReason || "Scheduling conflict",
    };

    return dispatchNotification({
      event: NotificationType.APPOINTMENT_CANCELLED,
      recipient: {
        name: variables.patientName || "Patient",
        email: variables.patientEmail || undefined,
        phone: variables.patientPhone || undefined,
        userId: appt.patientProfile?.userId,
      },
      variables,
      channels: customChannels || [NotificationChannel.EMAIL],
      clinicId: appt.clinicId,
      metadata: { appointmentId: appt.id, cancellationReason },
    });
  } catch (err: any) {
    console.error("[NotificationService] sendAppointmentCancelledNotification failed:", err.message);
    return [];
  }
}

/**
 * 4. Event: APPOINTMENT_RESCHEDULED
 */
export async function sendAppointmentRescheduledNotification(
  appointmentId: string,
  oldDate?: string,
  oldTime?: string,
  customChannels?: NotificationChannel[]
): Promise<NotificationResult[]> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        clinic: { include: { siteSettings: true } },
        doctor: { include: { user: true } },
        patientProfile: { include: { user: true } },
      },
    });

    if (!appt) return [];

    const variables: NotificationVariables = {
      patientName: appt.patientProfile?.user?.fullName || "Patient",
      patientEmail: appt.patientProfile?.user?.email,
      patientPhone: appt.patientProfile?.user?.phone,
      doctorName: appt.doctor?.user?.fullName || "Doctor",
      clinicName: appt.clinic?.name || "Doctor Plus",
      clinicAddress: appt.clinic?.address || "Main Clinic Road",
      clinicPhone: appt.clinic?.siteSettings?.contactPhone || appt.clinic?.phone || "+91 9876543210",
      appointmentNumber: appt.appointmentNumber,
      appointmentDate: appt.appointmentDate.toISOString().slice(0, 10),
      appointmentTime: appt.appointmentTime,
      rescheduledDate: oldDate,
      rescheduledTime: oldTime,
    };

    return dispatchNotification({
      event: NotificationType.APPOINTMENT_RESCHEDULED,
      recipient: {
        name: variables.patientName || "Patient",
        email: variables.patientEmail || undefined,
        phone: variables.patientPhone || undefined,
        userId: appt.patientProfile?.userId,
      },
      variables,
      channels: customChannels || [NotificationChannel.EMAIL],
      clinicId: appt.clinicId,
      metadata: { appointmentId: appt.id, oldDate, oldTime },
    });
  } catch (err: any) {
    console.error("[NotificationService] sendAppointmentRescheduledNotification failed:", err.message);
    return [];
  }
}

/**
 * 5. Event: APPOINTMENT_REMINDER
 */
export async function sendAppointmentReminderNotification(
  appointmentId: string,
  customChannels?: NotificationChannel[]
): Promise<NotificationResult[]> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        clinic: { include: { siteSettings: true } },
        doctor: { include: { user: true } },
        patientProfile: { include: { user: true } },
      },
    });

    if (!appt) return [];

    const variables: NotificationVariables = {
      patientName: appt.patientProfile?.user?.fullName || "Patient",
      patientEmail: appt.patientProfile?.user?.email,
      patientPhone: appt.patientProfile?.user?.phone,
      doctorName: appt.doctor?.user?.fullName || "Doctor",
      clinicName: appt.clinic?.name || "Doctor Plus",
      clinicAddress: appt.clinic?.address || "Main Clinic Road",
      appointmentNumber: appt.appointmentNumber,
      appointmentDate: appt.appointmentDate.toISOString().slice(0, 10),
      appointmentTime: appt.appointmentTime,
    };

    return dispatchNotification({
      event: NotificationType.APPOINTMENT_REMINDER,
      recipient: {
        name: variables.patientName || "Patient",
        email: variables.patientEmail || undefined,
        phone: variables.patientPhone || undefined,
        userId: appt.patientProfile?.userId,
      },
      variables,
      channels: customChannels || [NotificationChannel.EMAIL],
      clinicId: appt.clinicId,
      metadata: { appointmentId: appt.id },
    });
  } catch (err: any) {
    console.error("[NotificationService] sendAppointmentReminderNotification failed:", err.message);
    return [];
  }
}

/**
 * 6. Event: DOCTOR_SCHEDULE_CHANGED
 */
export async function sendDoctorScheduleChangedNotification(
  doctorId: string,
  scheduleChangeDetails: string,
  customChannels?: NotificationChannel[]
): Promise<NotificationResult[]> {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: true,
        clinic: { include: { siteSettings: true } },
      },
    });

    if (!doctor) return [];

    // Find upcoming affected appointments with this doctor
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        status: { in: ["PENDING", "CONFIRMED"] },
        appointmentDate: { gte: new Date() },
      },
      include: {
        patientProfile: { include: { user: true } },
      },
      take: 20,
    });

    const allResults: NotificationResult[] = [];

    for (const appt of upcomingAppointments) {
      const patient = appt.patientProfile?.user;
      if (!patient) continue;

      const variables: NotificationVariables = {
        patientName: patient.fullName,
        patientEmail: patient.email,
        patientPhone: patient.phone,
        doctorName: doctor.user.fullName,
        clinicName: doctor.clinic?.name || "Doctor Plus",
        clinicPhone: doctor.clinic?.siteSettings?.contactPhone || doctor.clinic?.phone || "+91 9876543210",
        scheduleChangeDetails,
        appointmentNumber: appt.appointmentNumber,
        appointmentDate: appt.appointmentDate.toISOString().slice(0, 10),
        appointmentTime: appt.appointmentTime,
      };

      const res = await dispatchNotification({
        event: NotificationType.DOCTOR_SCHEDULE_CHANGED,
        recipient: {
          name: patient.fullName,
          email: patient.email || undefined,
          phone: patient.phone || undefined,
          userId: patient.id,
        },
        variables,
        channels: customChannels || [NotificationChannel.EMAIL],
        clinicId: doctor.clinicId,
        metadata: { doctorId: doctor.id, appointmentId: appt.id },
      });

      allResults.push(...res);
    }

    return allResults;
  } catch (err: any) {
    console.error("[NotificationService] sendDoctorScheduleChangedNotification failed:", err.message);
    return [];
  }
}

/**
 * 7. Event: APPOINTMENT_COMPLETED
 */
export async function sendAppointmentCompletedNotification(
  appointmentId: string,
  customChannels?: NotificationChannel[]
): Promise<NotificationResult[]> {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        clinic: { include: { siteSettings: true } },
        doctor: { include: { user: true } },
        patientProfile: { include: { user: true } },
      },
    });

    if (!appt) return [];

    const variables: NotificationVariables = {
      patientName: appt.patientProfile?.user?.fullName || "Patient",
      patientEmail: appt.patientProfile?.user?.email,
      patientPhone: appt.patientProfile?.user?.phone,
      doctorName: appt.doctor?.user?.fullName || "Doctor",
      clinicName: appt.clinic?.name || "Doctor Plus",
      appointmentNumber: appt.appointmentNumber,
      appointmentDate: appt.appointmentDate.toISOString().slice(0, 10),
      notes: appt.doctorNotes || undefined,
    };

    return dispatchNotification({
      event: NotificationType.APPOINTMENT_COMPLETED,
      recipient: {
        name: variables.patientName || "Patient",
        email: variables.patientEmail || undefined,
        phone: variables.patientPhone || undefined,
        userId: appt.patientProfile?.userId,
      },
      variables,
      channels: customChannels || [NotificationChannel.EMAIL],
      clinicId: appt.clinicId,
      metadata: { appointmentId: appt.id },
    });
  } catch (err: any) {
    console.error("[NotificationService] sendAppointmentCompletedNotification failed:", err.message);
    return [];
  }
}

/**
 * Query Notification Logs with filtering and pagination.
 */
export async function getNotificationLogs(options: {
  clinicId?: string;
  event?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationDeliveryStatus;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {
    ...(options.clinicId && { clinicId: options.clinicId }),
    ...(options.event && { event: options.event }),
    ...(options.channel && { channel: options.channel }),
    ...(options.status && { status: options.status }),
    ...(options.search && {
      OR: [
        { recipient: { contains: options.search, mode: "insensitive" } },
        { subject: { contains: options.search, mode: "insensitive" } },
        { content: { contains: options.search, mode: "insensitive" } },
      ],
    }),
  };

  const [logs, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options.limit || 50,
      skip: options.offset || 0,
      include: {
        template: { select: { name: true } },
      },
    }),
    prisma.notificationLog.count({ where }),
  ]);

  return { logs, total };
}
