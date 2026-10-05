import { NotificationType, NotificationChannel, NotificationDeliveryStatus } from "@prisma/client";

export type NotificationEventType = NotificationType;
export type { NotificationChannel, NotificationDeliveryStatus };

export interface NotificationRecipient {
  name: string;
  email?: string | null;
  phone?: string | null;
  userId?: string | null;
}

export interface NotificationVariables extends Record<string, any> {
  patientName?: string;
  patientEmail?: string | null;
  patientPhone?: string | null;
  doctorName?: string;
  doctorSpecialization?: string;
  clinicName?: string;
  clinicPhone?: string | null;
  clinicAddress?: string | null;
  clinicSlug?: string;
  appointmentNumber?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentType?: string;
  serviceName?: string;
  amount?: string | number;
  paymentMethod?: string;
  paymentStatus?: string;
  transactionId?: string;
  receiptNumber?: string;
  cancellationReason?: string;
  rescheduledDate?: string;
  rescheduledTime?: string;
  scheduleChangeDetails?: string;
  notes?: string;
  link?: string;
}

export interface NotificationPayload {
  event: NotificationEventType;
  recipient: NotificationRecipient;
  variables: NotificationVariables;
  channels?: NotificationChannel[];
  clinicId?: string;
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  subject?: string;
  content: string;
  providerMessageId?: string;
  errorMessage?: string;
  logId?: string;
}

export interface ChannelSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  rawResponse?: any;
}
