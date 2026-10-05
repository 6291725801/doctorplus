import { NotificationType, NotificationChannel } from "@prisma/client";
import { NotificationVariables } from "../types";

export interface DefaultTemplateDefinition {
  event: NotificationType;
  channel: NotificationChannel;
  name: string;
  subject?: string;
  body: string;
  variables: string[];
  description: string;
}

/**
 * Standard variable placeholder replacer.
 * Replaces {{variableName}} with values provided in the variables object.
 */
export function renderTemplate(templateString: string, variables: NotificationVariables): string {
  if (!templateString) return "";
  return templateString.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = variables[key];
    if (val === undefined || val === null) {
      return "";
    }
    return String(val);
  });
}

/**
 * Default out-of-the-box templates for all 7 Phase 8 events.
 */
export const DEFAULT_NOTIFICATION_TEMPLATES: DefaultTemplateDefinition[] = [
  // 1. APPOINTMENT_BOOKED
  {
    event: "APPOINTMENT_BOOKED",
    channel: "EMAIL",
    name: "Appointment Confirmation (Email)",
    subject: "Appointment Confirmed #{{appointmentNumber}} - {{clinicName}}",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
  <div style="background-color: #0d9488; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="color: #ffffff; margin: 0;">Appointment Confirmed</h2>
  </div>
  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>{{patientName}}</strong>,</p>
    <p>Your appointment has been successfully scheduled at <strong>{{clinicName}}</strong>.</p>
    <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 4px 0;"><strong>Appointment #:</strong> {{appointmentNumber}}</p>
      <p style="margin: 4px 0;"><strong>Doctor:</strong> Dr. {{doctorName}} ({{doctorSpecialization}})</p>
      <p style="margin: 4px 0;"><strong>Date & Time:</strong> {{appointmentDate}} at {{appointmentTime}}</p>
      <p style="margin: 4px 0;"><strong>Type:</strong> {{appointmentType}}</p>
      <p style="margin: 4px 0;"><strong>Clinic Address:</strong> {{clinicAddress}}</p>
    </div>
    <p>Please arrive 10 minutes prior to your scheduled consultation time.</p>
    <p style="margin-top: 24px;">Warm regards,<br><strong>Team {{clinicName}}</strong><br>Contact: {{clinicPhone}}</p>
  </div>
</div>`,
    variables: ["patientName", "doctorName", "doctorSpecialization", "clinicName", "clinicPhone", "clinicAddress", "appointmentNumber", "appointmentDate", "appointmentTime", "appointmentType"],
    description: "Sent immediately when an appointment is booked by the patient or receptionist.",
  },
  {
    event: "APPOINTMENT_BOOKED",
    channel: "SMS",
    name: "Appointment Confirmation (SMS)",
    body: "Hi {{patientName}}, your appointment (#{{appointmentNumber}}) with Dr. {{doctorName}} at {{clinicName}} is confirmed for {{appointmentDate}} at {{appointmentTime}}. Helpline: {{clinicPhone}}",
    variables: ["patientName", "doctorName", "clinicName", "clinicPhone", "appointmentNumber", "appointmentDate", "appointmentTime"],
    description: "Short SMS notification sent when an appointment is confirmed.",
  },
  {
    event: "APPOINTMENT_BOOKED",
    channel: "WHATSAPP",
    name: "Appointment Confirmation (WhatsApp)",
    body: "Namaste {{patientName}}! 🙏\n\nYour appointment with *Dr. {{doctorName}}* at *{{clinicName}}* is confirmed.\n\n📅 *Date:* {{appointmentDate}}\n⏰ *Time:* {{appointmentTime}}\n🎫 *Token/Appt #:* {{appointmentNumber}}\n🏥 *Location:* {{clinicAddress}}\n\nNeed assistance? Call us at {{clinicPhone}}.",
    variables: ["patientName", "doctorName", "clinicName", "clinicPhone", "clinicAddress", "appointmentNumber", "appointmentDate", "appointmentTime"],
    description: "WhatsApp interactive message template for appointment confirmation.",
  },

  // 2. PAYMENT_SUCCESSFUL
  {
    event: "PAYMENT_SUCCESSFUL",
    channel: "EMAIL",
    name: "Payment Receipt (Email)",
    subject: "Payment Received: ₹{{amount}} for Appt #{{appointmentNumber}} - {{clinicName}}",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
  <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="color: #ffffff; margin: 0;">Payment Successful</h2>
  </div>
  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>{{patientName}}</strong>,</p>
    <p>We have successfully verified your payment of <strong>₹{{amount}}</strong> for Appointment <strong>#{{appointmentNumber}}</strong>.</p>
    <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 4px 0;"><strong>Receipt #:</strong> {{receiptNumber}}</p>
      <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ₹{{amount}}</p>
      <p style="margin: 4px 0;"><strong>Payment Method:</strong> {{paymentMethod}}</p>
      <p style="margin: 4px 0;"><strong>Transaction ID:</strong> {{transactionId}}</p>
    </div>
    <p>You can access your complete receipt and history in your patient portal.</p>
    <p style="margin-top: 24px;">Thank you,<br><strong>{{clinicName}}</strong></p>
  </div>
</div>`,
    variables: ["patientName", "clinicName", "appointmentNumber", "amount", "paymentMethod", "transactionId", "receiptNumber"],
    description: "Sent automatically when a payment attempt is authorized and verified.",
  },
  {
    event: "PAYMENT_SUCCESSFUL",
    channel: "SMS",
    name: "Payment Receipt (SMS)",
    body: "Payment of Rs. {{amount}} received for appt #{{appointmentNumber}} at {{clinicName}}. Receipt: {{receiptNumber}}. Thank you!",
    variables: ["amount", "appointmentNumber", "clinicName", "receiptNumber"],
    description: "SMS receipt notification on verified payment.",
  },
  {
    event: "PAYMENT_SUCCESSFUL",
    channel: "WHATSAPP",
    name: "Payment Receipt (WhatsApp)",
    body: "✅ *Payment Successful*\n\nHi {{patientName}}, your payment of *₹{{amount}}* for Appointment #{{appointmentNumber}} at *{{clinicName}}* has been received.\n\n🧾 *Receipt:* {{receiptNumber}}\n💳 *Mode:* {{paymentMethod}}",
    variables: ["patientName", "amount", "appointmentNumber", "clinicName", "receiptNumber", "paymentMethod"],
    description: "WhatsApp confirmation with receipt details.",
  },

  // 3. APPOINTMENT_CANCELLED
  {
    event: "APPOINTMENT_CANCELLED",
    channel: "EMAIL",
    name: "Appointment Cancelled (Email)",
    subject: "Appointment Cancelled: #{{appointmentNumber}} - {{clinicName}}",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
  <div style="background-color: #ef4444; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="color: #ffffff; margin: 0;">Appointment Cancelled</h2>
  </div>
  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>{{patientName}}</strong>,</p>
    <p>Your appointment <strong>#{{appointmentNumber}}</strong> scheduled for <strong>{{appointmentDate}} at {{appointmentTime}}</strong> with <strong>Dr. {{doctorName}}</strong> has been cancelled.</p>
    <p><strong>Reason:</strong> {{cancellationReason}}</p>
    <p>If advance fee was paid and is eligible under the cancellation policy, your refund will be processed in accordance with the clinic terms.</p>
    <p>Need to reschedule? Please visit our portal or contact {{clinicPhone}}.</p>
    <p style="margin-top: 24px;">Sincerely,<br><strong>{{clinicName}}</strong></p>
  </div>
</div>`,
    variables: ["patientName", "doctorName", "clinicName", "clinicPhone", "appointmentNumber", "appointmentDate", "appointmentTime", "cancellationReason"],
    description: "Sent when an appointment is cancelled by patient, doctor, or administrator.",
  },
  {
    event: "APPOINTMENT_CANCELLED",
    channel: "SMS",
    name: "Appointment Cancelled (SMS)",
    body: "Notice: Appt #{{appointmentNumber}} with Dr. {{doctorName}} on {{appointmentDate}} has been cancelled. Reason: {{cancellationReason}}. For assistance call {{clinicPhone}}.",
    variables: ["appointmentNumber", "doctorName", "appointmentDate", "cancellationReason", "clinicPhone"],
    description: "SMS alert for cancelled appointment.",
  },
  {
    event: "APPOINTMENT_CANCELLED",
    channel: "WHATSAPP",
    name: "Appointment Cancelled (WhatsApp)",
    body: "⚠️ *Appointment Cancellation Notice*\n\nDear {{patientName}}, your appointment *#{{appointmentNumber}}* with *Dr. {{doctorName}}* on {{appointmentDate}} at {{appointmentTime}} has been cancelled.\n\n*Reason:* {{cancellationReason}}\n\nTo rebook or ask questions, please call us at {{clinicPhone}}.",
    variables: ["patientName", "appointmentNumber", "doctorName", "appointmentDate", "appointmentTime", "cancellationReason", "clinicPhone"],
    description: "WhatsApp alert for cancelled appointment.",
  },

  // 4. APPOINTMENT_RESCHEDULED
  {
    event: "APPOINTMENT_RESCHEDULED",
    channel: "EMAIL",
    name: "Appointment Rescheduled (Email)",
    subject: "Rescheduled: Appointment #{{appointmentNumber}} - {{clinicName}}",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
  <div style="background-color: #3b82f6; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="color: #ffffff; margin: 0;">Appointment Rescheduled</h2>
  </div>
  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>{{patientName}}</strong>,</p>
    <p>Your appointment <strong>#{{appointmentNumber}}</strong> with <strong>Dr. {{doctorName}}</strong> has been successfully rescheduled.</p>
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 4px 0;"><strong>New Date & Time:</strong> {{appointmentDate}} at {{appointmentTime}}</p>
      <p style="margin: 4px 0;"><strong>Doctor:</strong> Dr. {{doctorName}}</p>
      <p style="margin: 4px 0;"><strong>Location:</strong> {{clinicAddress}}</p>
    </div>
    <p>Please make a note of this updated schedule.</p>
    <p style="margin-top: 24px;">Best regards,<br><strong>{{clinicName}}</strong></p>
  </div>
</div>`,
    variables: ["patientName", "doctorName", "clinicName", "clinicAddress", "appointmentNumber", "appointmentDate", "appointmentTime"],
    description: "Sent when an appointment date or time slot is modified.",
  },
  {
    event: "APPOINTMENT_RESCHEDULED",
    channel: "SMS",
    name: "Appointment Rescheduled (SMS)",
    body: "Your appt #{{appointmentNumber}} with Dr. {{doctorName}} at {{clinicName}} has been rescheduled to {{appointmentDate}} at {{appointmentTime}}. Helpline: {{clinicPhone}}.",
    variables: ["appointmentNumber", "doctorName", "clinicName", "appointmentDate", "appointmentTime", "clinicPhone"],
    description: "SMS alert for rescheduled appointment.",
  },
  {
    event: "APPOINTMENT_RESCHEDULED",
    channel: "WHATSAPP",
    name: "Appointment Rescheduled (WhatsApp)",
    body: "🗓️ *Appointment Rescheduled*\n\nHello {{patientName}}, your appointment *#{{appointmentNumber}}* with *Dr. {{doctorName}}* has been rescheduled.\n\n✨ *New Schedule:* {{appointmentDate}} at {{appointmentTime}}\n🏥 *Venue:* {{clinicAddress}}\n\nNeed to reach us? Call {{clinicPhone}}.",
    variables: ["patientName", "appointmentNumber", "doctorName", "appointmentDate", "appointmentTime", "clinicAddress", "clinicPhone"],
    description: "WhatsApp alert for rescheduled appointment.",
  },

  // 5. APPOINTMENT_REMINDER
  {
    event: "APPOINTMENT_REMINDER",
    channel: "EMAIL",
    name: "Appointment Reminder (Email)",
    subject: "Reminder: Upcoming Appointment #{{appointmentNumber}} Tomorrow - {{clinicName}}",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
  <div style="background-color: #6366f1; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="color: #ffffff; margin: 0;">Appointment Reminder</h2>
  </div>
  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>{{patientName}}</strong>,</p>
    <p>This is a friendly reminder for your upcoming consultation at <strong>{{clinicName}}</strong>.</p>
    <div style="background-color: #f5f3ff; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 4px 0;"><strong>Doctor:</strong> Dr. {{doctorName}}</p>
      <p style="margin: 4px 0;"><strong>Date:</strong> {{appointmentDate}}</p>
      <p style="margin: 4px 0;"><strong>Time:</strong> {{appointmentTime}}</p>
      <p style="margin: 4px 0;"><strong>Clinic Address:</strong> {{clinicAddress}}</p>
    </div>
    <p>Please carry your previous medical records or prescriptions if applicable.</p>
    <p style="margin-top: 24px;">See you soon,<br><strong>Team {{clinicName}}</strong></p>
  </div>
</div>`,
    variables: ["patientName", "doctorName", "clinicName", "clinicAddress", "appointmentNumber", "appointmentDate", "appointmentTime"],
    description: "Automated reminder dispatched prior to the appointment.",
  },
  {
    event: "APPOINTMENT_REMINDER",
    channel: "SMS",
    name: "Appointment Reminder (SMS)",
    body: "Reminder: You have an appointment with Dr. {{doctorName}} at {{clinicName}} on {{appointmentDate}} at {{appointmentTime}}. Please reach 10 mins prior.",
    variables: ["doctorName", "clinicName", "appointmentDate", "appointmentTime"],
    description: "SMS reminder notification.",
  },
  {
    event: "APPOINTMENT_REMINDER",
    channel: "WHATSAPP",
    name: "Appointment Reminder (WhatsApp)",
    body: "🔔 *Upcoming Appointment Reminder*\n\nNamaste {{patientName}}, your consultation with *Dr. {{doctorName}}* is scheduled for:\n\n📅 {{appointmentDate}}\n⏰ {{appointmentTime}}\n🏥 {{clinicAddress}}\n\nPlease arrive 10 minutes before your slot.",
    variables: ["patientName", "doctorName", "appointmentDate", "appointmentTime", "clinicAddress"],
    description: "WhatsApp reminder notification.",
  },

  // 6. DOCTOR_SCHEDULE_CHANGED
  {
    event: "DOCTOR_SCHEDULE_CHANGED",
    channel: "EMAIL",
    name: "Doctor Schedule Changed (Email)",
    subject: "Update Regarding Dr. {{doctorName}}'s Schedule - {{clinicName}}",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
  <div style="background-color: #f59e0b; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="color: #ffffff; margin: 0;">Schedule Update Notification</h2>
  </div>
  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>{{patientName}}</strong>,</p>
    <p>Please note that there has been an update regarding <strong>Dr. {{doctorName}}'s</strong> clinic availability.</p>
    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 4px 0;"><strong>Details:</strong> {{scheduleChangeDetails}}</p>
    </div>
    <p>If this affects any of your booked consultations, our team will proactively reach out to assist with rescheduling.</p>
    <p style="margin-top: 24px;">Warm regards,<br><strong>{{clinicName}}</strong><br>Phone: {{clinicPhone}}</p>
  </div>
</div>`,
    variables: ["patientName", "doctorName", "clinicName", "clinicPhone", "scheduleChangeDetails"],
    description: "Dispatched to affected patients when a doctor's weekly roster or leave is modified.",
  },
  {
    event: "DOCTOR_SCHEDULE_CHANGED",
    channel: "SMS",
    name: "Doctor Schedule Changed (SMS)",
    body: "Notice: Schedule updated for Dr. {{doctorName}} at {{clinicName}}. Info: {{scheduleChangeDetails}}. Helpline: {{clinicPhone}}.",
    variables: ["doctorName", "clinicName", "scheduleChangeDetails", "clinicPhone"],
    description: "SMS alert for doctor schedule changes.",
  },
  {
    event: "DOCTOR_SCHEDULE_CHANGED",
    channel: "WHATSAPP",
    name: "Doctor Schedule Changed (WhatsApp)",
    body: "📢 *Doctor Schedule Update*\n\nHello {{patientName}},\n\nPlease be informed of an update to *Dr. {{doctorName}}'s* availability at *{{clinicName}}*:\n\n{{scheduleChangeDetails}}\n\nQuestions? Call us at {{clinicPhone}}.",
    variables: ["patientName", "doctorName", "clinicName", "scheduleChangeDetails", "clinicPhone"],
    description: "WhatsApp alert for doctor schedule change.",
  },

  // 7. APPOINTMENT_COMPLETED
  {
    event: "APPOINTMENT_COMPLETED",
    channel: "EMAIL",
    name: "Appointment Completed & Feedback (Email)",
    subject: "Thank you for visiting {{clinicName}} - Appt #{{appointmentNumber}}",
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
  <div style="background-color: #0d9488; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="color: #ffffff; margin: 0;">Consultation Completed</h2>
  </div>
  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>{{patientName}}</strong>,</p>
    <p>Thank you for consulting with <strong>Dr. {{doctorName}}</strong> at <strong>{{clinicName}}</strong> today.</p>
    <p>Your doctor's consultation notes and care recommendations are now updated in your patient portal.</p>
    <p>We hope you had a pleasant experience. Please take care of your health!</p>
    <p style="margin-top: 24px;">Wishing you wellness,<br><strong>{{clinicName}}</strong></p>
  </div>
</div>`,
    variables: ["patientName", "doctorName", "clinicName", "appointmentNumber", "appointmentDate"],
    description: "Sent when doctor marks consultation as COMPLETED.",
  },
  {
    event: "APPOINTMENT_COMPLETED",
    channel: "SMS",
    name: "Appointment Completed (SMS)",
    body: "Thank you for visiting {{clinicName}}! Your consultation with Dr. {{doctorName}} (Appt #{{appointmentNumber}}) is completed. Stay healthy!",
    variables: ["clinicName", "doctorName", "appointmentNumber"],
    description: "SMS thank-you note when consultation finishes.",
  },
  {
    event: "APPOINTMENT_COMPLETED",
    channel: "WHATSAPP",
    name: "Appointment Completed (WhatsApp)",
    body: "🌸 *Consultation Completed*\n\nThank you {{patientName}} for visiting *{{clinicName}}* today. Your consultation with *Dr. {{doctorName}}* (Appt #{{appointmentNumber}}) is complete.\n\nYour prescription and notes are available in your portal.\n\nTake care!",
    variables: ["patientName", "clinicName", "doctorName", "appointmentNumber"],
    description: "WhatsApp completion & follow-up message.",
  },
];
