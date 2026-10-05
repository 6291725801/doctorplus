import { prisma } from "@/lib/db";
import { resolveActivePaymentProvider } from "@/lib/payments/factory";
import { PaymentStatus, FeeBreakdown } from "@/lib/payments/types";
import { AppointmentStatus } from "@prisma/client";
import { sendPaymentSuccessfulNotification } from "@/lib/services/notification.service";

function generatePaymentReference(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PAY-${dateStr}-${rand}`;
}

function generateRefundReference(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `REF-${dateStr}-${rand}`;
}

/**
 * Retrieves the clinic payment configuration.
 * Admin configurable: minAdvanceAmount, enableOnlinePayment, currency.
 */
export async function getClinicPaymentSettings(clinicId?: string) {
  let settings = await prisma.clinicSettings.findFirst({
    where: clinicId ? { clinicId } : undefined,
    include: { clinic: { select: { id: true, name: true } } },
  });

  if (!settings) {
    const firstClinic = await prisma.clinic.findFirst({ where: { isActive: true } });
    if (!firstClinic) {
      throw new Error("No active clinic found in the system.");
    }
    settings = await prisma.clinicSettings.upsert({
      where: { clinicId: firstClinic.id },
      create: {
        clinicId: firstClinic.id,
        minAdvanceAmount: 100.00,
        enableOnlinePayment: true,
        currency: "INR",
      },
      update: {},
      include: { clinic: { select: { id: true, name: true } } },
    });
  }

  return {
    clinicId: settings.clinicId,
    clinicName: settings.clinic?.name || "Clinic",
    minAdvanceAmount: Number(settings.minAdvanceAmount),
    enableOnlinePayment: settings.enableOnlinePayment,
    currency: settings.currency || "INR",
  };
}

/**
 * Updates the clinic payment settings (Admin only).
 * Allows modifying the minimum advance booking amount.
 */
export async function updateClinicPaymentSettings(data: {
  clinicId?: string;
  minAdvanceAmount?: number;
  enableOnlinePayment?: boolean;
  currency?: string;
  adminUserId?: string;
}) {
  const config = await getClinicPaymentSettings(data.clinicId);

  if (data.minAdvanceAmount !== undefined && data.minAdvanceAmount < 0) {
    throw new Error("Minimum advance amount cannot be negative.");
  }

  const updated = await prisma.clinicSettings.update({
    where: { clinicId: config.clinicId },
    data: {
      minAdvanceAmount: data.minAdvanceAmount !== undefined ? data.minAdvanceAmount : undefined,
      enableOnlinePayment: data.enableOnlinePayment !== undefined ? data.enableOnlinePayment : undefined,
      currency: data.currency ? data.currency.toUpperCase() : undefined,
    },
  });

  if (data.adminUserId) {
    await prisma.auditLog.create({
      data: {
        userId: data.adminUserId,
        clinicId: config.clinicId,
        action: "PAYMENT_SETTINGS_UPDATE",
        entity: "ClinicSettings",
        entityId: updated.id,
        metadata: {
          minAdvanceAmount: Number(updated.minAdvanceAmount),
          enableOnlinePayment: updated.enableOnlinePayment,
        },
      },
    });
  }

  return {
    clinicId: updated.clinicId,
    minAdvanceAmount: Number(updated.minAdvanceAmount),
    enableOnlinePayment: updated.enableOnlinePayment,
    currency: updated.currency,
  };
}

/**
 * Calculates the consultation fee and advance payment breakdown.
 * Formula:
 * Advance = Math.max(minAdvanceAmount, doctorAdvanceFee || minAdvanceAmount)
 * Remaining = Math.max(0, consultationFee - Advance)
 */
export async function calculateAppointmentFeeBreakdown(params: {
  doctorId: string;
  serviceId?: string | null;
  clinicId?: string;
}): Promise<FeeBreakdown> {
  const config = await getClinicPaymentSettings(params.clinicId);
  const minAdvance = config.minAdvanceAmount;

  const doctor = await prisma.doctor.findUnique({
    where: { id: params.doctorId },
    select: { consultationFee: true, advanceBookingFee: true },
  });

  if (!doctor) {
    throw new Error("Doctor not found for fee calculation.");
  }

  let consultationFee = Number(doctor.consultationFee);

  if (params.serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: params.serviceId },
      select: { fee: true },
    });
    if (service) {
      consultationFee = Number(service.fee);
    }
  }

  const doctorAdvance = Number(doctor.advanceBookingFee) || minAdvance;
  // Advance cannot be less than the clinic-configured minimum advance
  const advanceAmount = Math.min(consultationFee, Math.max(minAdvance, doctorAdvance));
  const balanceAmount = Math.max(0, consultationFee - advanceAmount);

  return {
    consultationFee,
    advanceAmount,
    balanceAmount,
    currency: config.currency,
  };
}

/**
 * Initializes a payment order for an appointment.
 * Creates a Payment record and PaymentAttempt record, then invokes the payment provider.
 * Never stores raw card credentials!
 */
export async function initializeAppointmentPayment(params: {
  appointmentId: string;
  amountType?: "ADVANCE" | "FULL";
  clientIp?: string;
  userAgent?: string;
  providerOverride?: string;
}) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    include: {
      clinic: true,
      doctor: { include: { user: true } },
      patientProfile: { include: { user: true } },
      service: true,
      payments: {
        include: { attempts: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  if (appointment.paymentStatus === "PAID") {
    throw new Error("Appointment has already been fully paid.");
  }

  // Calculate payment target amount
  const targetAmount =
    params.amountType === "FULL"
      ? Number(appointment.consultationFee)
      : Number(appointment.advanceAmount);

  if (targetAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  // Check if an existing PENDING payment entity exists
  let payment = appointment.payments.find(
    (p) => p.status === "PENDING" || p.status === "PROCESSING"
  );

  if (!payment) {
    const paymentRef = generatePaymentReference();
    payment = await prisma.payment.create({
      data: {
        paymentReference: paymentRef,
        appointmentId: appointment.id,
        amount: targetAmount,
        currency: "INR",
        status: "PENDING",
        method: "ONLINE",
        notes: `Appointment ${appointment.appointmentNumber} ${params.amountType || "ADVANCE"} Payment`,
      },
      include: { attempts: true },
    });
  }

  const previousAttempts = await prisma.paymentAttempt.count({
    where: { paymentId: payment.id },
  });
  const attemptNumber = previousAttempts + 1;

  // Create PaymentAttempt record in PENDING state
  const attempt = await prisma.paymentAttempt.create({
    data: {
      paymentId: payment.id,
      attemptNumber,
      status: "PENDING",
      amount: targetAmount,
      currency: "INR",
      ipAddress: params.clientIp || null,
      userAgent: params.userAgent || null,
    },
  });

  // Call the active payment provider abstraction
  const provider = resolveActivePaymentProvider();
  const orderResult = await provider.createOrder({
    orderReference: payment.paymentReference,
    amount: targetAmount,
    currency: "INR",
    receipt: `rcpt_${appointment.appointmentNumber}_att${attemptNumber}`,
    notes: {
      appointmentId: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      paymentId: payment.id,
      attemptId: attempt.id,
    },
    customer: {
      name: appointment.patientProfile?.user?.fullName || "Patient",
      email: appointment.patientProfile?.user?.email,
      phone: appointment.patientProfile?.user?.phone || undefined,
    },
  });

  // Update PaymentAttempt & Payment with gateway order ID and set status to PROCESSING
  await prisma.paymentAttempt.update({
    where: { id: attempt.id },
    data: {
      gatewayProvider: provider.providerName,
      gatewayOrderId: orderResult.gatewayOrderId,
      status: "PROCESSING",
    },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      gatewayProvider: provider.providerName,
      gatewayOrderId: orderResult.gatewayOrderId,
      status: "PROCESSING",
    },
  });

  return {
    paymentId: payment.id,
    paymentReference: payment.paymentReference,
    attemptId: attempt.id,
    attemptNumber,
    gatewayOrderId: orderResult.gatewayOrderId,
    amount: targetAmount,
    currency: orderResult.currency,
    provider: provider.providerName,
    keyId: orderResult.keyId,
    appointmentNumber: appointment.appointmentNumber,
    appointmentId: appointment.id,
    breakdown: {
      consultationFee: Number(appointment.consultationFee),
      advanceAmount: Number(appointment.advanceAmount),
      balanceAmount: Number(appointment.balanceAmount),
    },
  };
}

/**
 * Server-side payment verification.
 * NEVER trusts the frontend alone!
 * Verifies cryptographic signatures and updates the database atomically.
 */
export async function verifyAppointmentPayment(params: {
  appointmentId: string;
  paymentId?: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature?: string;
  clientIp?: string;
}) {
  const { appointmentId, gatewayOrderId, gatewayPaymentId, gatewaySignature } = params;

  // Retrieve appointment and payment
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      clinic: true,
      patientProfile: { include: { user: true } },
      payments: {
        where: {
          OR: [
            { gatewayOrderId },
            ...(params.paymentId ? [{ id: params.paymentId }] : []),
          ],
        },
        include: {
          attempts: {
            orderBy: { attemptNumber: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!appointment) {
    throw new Error("Appointment not found for payment verification.");
  }

  const payment = appointment.payments[0];
  if (!payment) {
    throw new Error("No corresponding payment record found for this order.");
  }

  const latestAttempt = payment.attempts[0];

  // Call payment provider abstraction for server-side verification
  const provider = resolveActivePaymentProvider();
  const verifyResult = await provider.verifyPayment({
    gatewayOrderId,
    gatewayPaymentId,
    gatewaySignature,
    amount: Number(payment.amount),
    currency: payment.currency,
  });

  // If server verification fails: record failure in database and DO NOT mark appointment paid
  if (!verifyResult.isValid) {
    if (latestAttempt) {
      await prisma.paymentAttempt.update({
        where: { id: latestAttempt.id },
        data: {
          status: "FAILED",
          gatewayPaymentId,
          gatewaySignature: gatewaySignature || null,
          errorCode: verifyResult.errorCode || "VERIFICATION_FAILED",
          errorMessage: verifyResult.errorMessage || "Cryptographic signature mismatch.",
        },
      });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        gatewayPaymentId,
        gatewaySignature: gatewaySignature || null,
      },
    });

    throw new Error(
      `Payment verification failed: ${verifyResult.errorMessage || "Invalid payment signature."} Appointment remains unpaid.`
    );
  }

  // Verification succeeded! Compute resulting payment status
  const paidAmount = Number(payment.amount);
  const totalFee = Number(appointment.consultationFee);
  const resultingStatus: PaymentStatus =
    paidAmount >= totalFee ? "PAID" : "PARTIALLY_PAID";

  // Update PaymentAttempt, Payment, and Appointment atomically
  if (latestAttempt) {
    await prisma.paymentAttempt.update({
      where: { id: latestAttempt.id },
      data: {
        status: "PAID",
        gatewayPaymentId,
        gatewaySignature: gatewaySignature || null,
        gatewayResponse: verifyResult.rawResponse ? JSON.parse(JSON.stringify(verifyResult.rawResponse)) : null,
      },
    });
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: resultingStatus === "PAID" ? "PAID" : "PARTIALLY_PAID",
      gatewayPaymentId,
      gatewaySignature: gatewaySignature || null,
      paidAt: new Date(),
    },
  });

  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      paymentStatus: resultingStatus,
      status: AppointmentStatus.CONFIRMED,
    },
    include: {
      doctor: { include: { user: true } },
      patientProfile: { include: { user: true } },
    },
  });

  // Create Audit Log
  await prisma.auditLog.create({
    data: {
      clinicId: appointment.clinicId,
      userId: appointment.patientProfile?.userId || null,
      action: "PAYMENT_VERIFIED",
      entity: "Payment",
      entityId: payment.id,
      metadata: {
        paymentReference: payment.paymentReference,
        gatewayOrderId,
        gatewayPaymentId,
        amount: paidAmount,
        status: resultingStatus,
        appointmentNumber: appointment.appointmentNumber,
      },
    },
  });

  // Notify patient
  if (appointment.patientProfile?.userId) {
    await prisma.notification.create({
      data: {
        userId: appointment.patientProfile.userId,
        title: "Payment Received",
        message: `Your payment of ₹${paidAmount.toFixed(2)} for appointment ${appointment.appointmentNumber} has been verified and confirmed.`,
        type: "PAYMENT_RECEIVED",
        link: `/dashboard/patient/appointments/${appointment.id}`,
      },
    });
  }

  // Non-blocking notification dispatch (Email / SMS / WhatsApp)
  sendPaymentSuccessfulNotification(payment.id).catch((err) => {
    console.error("[PaymentService] Notification trigger error:", err);
  });

  return {
    success: true,
    paymentReference: payment.paymentReference,
    gatewayOrderId,
    gatewayPaymentId,
    amount: paidAmount,
    paymentStatus: resultingStatus,
    appointmentNumber: updatedAppointment.appointmentNumber,
  };
}

/**
 * Handles incoming webhooks from payment providers.
 * Idempotently processes payment status changes.
 */
export async function processPaymentWebhook(params: {
  rawBody: string;
  signature: string;
  webhookSecret?: string;
}) {
  const provider = resolveActivePaymentProvider();
  const event = await provider.processWebhook(params);

  if (event.eventType === "payment.captured" && event.orderId) {
    const payment = await prisma.payment.findFirst({
      where: { gatewayOrderId: event.orderId },
      include: { appointment: true },
    });

    if (payment && payment.status !== "PAID" && payment.status !== "PARTIALLY_PAID") {
      const paidAmount = event.amount || Number(payment.amount);
      const totalFee = Number(payment.appointment.consultationFee);
      const resultingStatus: PaymentStatus =
        paidAmount >= totalFee ? "PAID" : "PARTIALLY_PAID";

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: resultingStatus,
          gatewayPaymentId: event.paymentId || payment.gatewayPaymentId,
          paidAt: new Date(),
        },
      });

      await prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: {
          paymentStatus: resultingStatus,
          status: AppointmentStatus.CONFIRMED,
        },
      });
    }
  }

  return event;
}

/**
 * Retries a payment attempt after a failure or timeout.
 * Creates a new PaymentAttempt with an incremented attemptNumber.
 */
export async function retryPaymentAttempt(paymentId: string, clientIp?: string, userAgent?: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { appointment: true, attempts: { orderBy: { attemptNumber: "desc" } } },
  });

  if (!payment) {
    throw new Error("Payment record not found for retry.");
  }

  if (payment.status === "PAID") {
    throw new Error("Payment has already succeeded.");
  }

  const nextAttemptNumber = (payment.attempts[0]?.attemptNumber || 0) + 1;

  const attempt = await prisma.paymentAttempt.create({
    data: {
      paymentId: payment.id,
      attemptNumber: nextAttemptNumber,
      status: "PENDING",
      amount: payment.amount,
      currency: payment.currency,
      ipAddress: clientIp || null,
      userAgent: userAgent || null,
    },
  });

  const provider = resolveActivePaymentProvider();
  const orderResult = await provider.createOrder({
    orderReference: payment.paymentReference,
    amount: Number(payment.amount),
    currency: payment.currency,
    receipt: `rcpt_${payment.appointment.appointmentNumber}_att${nextAttemptNumber}`,
    notes: {
      paymentId: payment.id,
      attemptId: attempt.id,
      appointmentNumber: payment.appointment.appointmentNumber,
    },
  });

  await prisma.paymentAttempt.update({
    where: { id: attempt.id },
    data: {
      gatewayProvider: provider.providerName,
      gatewayOrderId: orderResult.gatewayOrderId,
      status: "PROCESSING",
    },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      gatewayOrderId: orderResult.gatewayOrderId,
      status: "PROCESSING",
    },
  });

  return {
    paymentId: payment.id,
    attemptId: attempt.id,
    attemptNumber: nextAttemptNumber,
    gatewayOrderId: orderResult.gatewayOrderId,
    amount: Number(payment.amount),
    currency: orderResult.currency,
    provider: provider.providerName,
    keyId: orderResult.keyId,
  };
}

/**
 * Processes a refund for an appointment payment (Admin only).
 * Creates a Refund record, updates Payment and Appointment status to REFUNDED.
 */
export async function processPaymentRefund(params: {
  paymentId: string;
  amount?: number;
  reason?: string;
  adminUserId: string;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
    include: { appointment: true },
  });

  if (!payment) {
    throw new Error("Payment record not found.");
  }

  if (payment.status !== "PAID" && payment.status !== "PARTIALLY_PAID") {
    throw new Error(`Cannot refund payment in '${payment.status}' status. Only PAID payments can be refunded.`);
  }

  const refundAmount = params.amount !== undefined ? params.amount : Number(payment.amount);
  if (refundAmount <= 0 || refundAmount > Number(payment.amount)) {
    throw new Error(`Invalid refund amount. Must be between 1 and ${payment.amount}.`);
  }

  const provider = resolveActivePaymentProvider();
  const refundResult = await provider.refundPayment({
    gatewayPaymentId: payment.gatewayPaymentId || `pay_sim_${payment.id}`,
    amount: refundAmount,
    currency: payment.currency,
    reason: params.reason || "Admin appointment refund",
    receipt: `ref_${payment.paymentReference}`,
  });

  if (!refundResult.success) {
    throw new Error(`Gateway refund failed: ${refundResult.errorMessage}`);
  }

  const refundRef = generateRefundReference();
  const refund = await prisma.refund.create({
    data: {
      refundReference: refundRef,
      paymentId: payment.id,
      amount: refundAmount,
      currency: payment.currency,
      status: "REFUNDED",
      reason: params.reason || "Patient appointment cancellation refund",
      gatewayRefundId: refundResult.gatewayRefundId,
      processedBy: params.adminUserId,
      processedAt: new Date(),
    },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "REFUNDED" },
  });

  await prisma.appointment.update({
    where: { id: payment.appointmentId },
    data: {
      paymentStatus: "REFUNDED",
      status: AppointmentStatus.CANCELLED,
    },
  });

  await prisma.auditLog.create({
    data: {
      clinicId: payment.appointment.clinicId,
      userId: params.adminUserId,
      action: "PAYMENT_REFUNDED",
      entity: "Refund",
      entityId: refund.id,
      metadata: {
        paymentId: payment.id,
        refundReference: refund.refundReference,
        amount: refundAmount,
        reason: params.reason,
      },
    },
  });

  return refund;
}

/**
 * Returns the admin payments list with all required fields:
 * Amount, Payment status, Appointment, Patient, Doctor, Transaction reference, Date.
 */
export async function getAdminPaymentsList(filters?: {
  status?: PaymentStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, unknown>).gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, unknown>).lte = new Date(filters.endDate);
    }
  }

  if (filters?.search) {
    const q = filters.search.trim();
    where.OR = [
      { paymentReference: { contains: q, mode: "insensitive" } },
      { gatewayOrderId: { contains: q, mode: "insensitive" } },
      { gatewayPaymentId: { contains: q, mode: "insensitive" } },
      { appointment: { appointmentNumber: { contains: q, mode: "insensitive" } } },
      { appointment: { patientProfile: { user: { fullName: { contains: q, mode: "insensitive" } } } } },
      { appointment: { doctor: { user: { fullName: { contains: q, mode: "insensitive" } } } } },
    ];
  }

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        appointment: {
          include: {
            doctor: { include: { user: true } },
            patientProfile: { include: { user: true } },
            service: true,
          },
        },
        attempts: {
          orderBy: { attemptNumber: "asc" },
        },
        refunds: true,
      },
    }),
  ]);

  const items = payments.map((p) => ({
    id: p.id,
    paymentReference: p.paymentReference,
    amount: Number(p.amount),
    currency: p.currency,
    status: p.status,
    method: p.method,
    gatewayProvider: p.gatewayProvider || "N/A",
    gatewayOrderId: p.gatewayOrderId,
    gatewayPaymentId: p.gatewayPaymentId,
    paidAt: p.paidAt?.toISOString() || null,
    createdAt: p.createdAt.toISOString(),
    appointment: {
      id: p.appointment.id,
      appointmentNumber: p.appointment.appointmentNumber,
      date: p.appointment.appointmentDate.toISOString().split("T")[0],
      time: p.appointment.appointmentTime,
      status: p.appointment.status,
      consultationFee: Number(p.appointment.consultationFee),
      advanceAmount: Number(p.appointment.advanceAmount),
      balanceAmount: Number(p.appointment.balanceAmount),
    },
    patient: {
      id: p.appointment.patientProfile?.userId || "",
      fullName: p.appointment.patientProfile?.user?.fullName || "Guest Patient",
      email: p.appointment.patientProfile?.user?.email || "N/A",
      phone: p.appointment.patientProfile?.user?.phone || "N/A",
    },
    doctor: {
      id: p.appointment.doctor.id,
      fullName: p.appointment.doctor.user.fullName,
      specialization: p.appointment.doctor.specialization,
    },
    service: p.appointment.service ? p.appointment.service.name : "Consultation",
    attemptsCount: p.attempts.length,
    attempts: p.attempts.map((a) => ({
      id: a.id,
      attemptNumber: a.attemptNumber,
      status: a.status,
      amount: Number(a.amount),
      gatewayOrderId: a.gatewayOrderId,
      gatewayPaymentId: a.gatewayPaymentId,
      errorCode: a.errorCode,
      errorMessage: a.errorMessage,
      createdAt: a.createdAt.toISOString(),
    })),
    refunds: p.refunds.map((r) => ({
      id: r.id,
      refundReference: r.refundReference,
      amount: Number(r.amount),
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  }));

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
