import { NextRequest } from "next/server";
import { providerRegistry } from "@/lib/notifications/registry";
import { successResponse, errorResponse, handleApiError } from "@/lib/utils/api-response";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email address is required"),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(5, "Message must be at least 5 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = contactSchema.parse(body);

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "rohitkumar725801@gmail.com";
    const emailProvider = providerRegistry.getEmailProvider();

    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // 1. Send notification email to Admin (Rohit Kumar)
    const adminMailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="background-color: #0d9488; padding: 16px 20px; border-radius: 8px; color: #ffffff; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px;">📬 New Patient Inquiry Received</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Doctor Plus Medical Clinic</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 130px;"><strong>Sender Name:</strong></td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${validated.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;"><strong>Sender Email:</strong></td>
            <td style="padding: 8px 0; color: #0f172a;"><a href="mailto:${validated.email}" style="color: #0d9488; text-decoration: none;">${validated.email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;"><strong>Phone Number:</strong></td>
            <td style="padding: 8px 0; color: #0f172a;">${validated.phone || "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;"><strong>Subject:</strong></td>
            <td style="padding: 8px 0; color: #0f172a;">${validated.subject || "General Consultation Inquiry"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;"><strong>Received At:</strong></td>
            <td style="padding: 8px 0; color: #0f172a;">${timestamp}</td>
          </tr>
        </table>

        <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
          <strong style="display: block; margin-bottom: 8px; color: #334155;">Message Content:</strong>
          <p style="margin: 0; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${validated.message}</p>
        </div>

        <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
          This email was generated automatically by the clinic contact form.
        </p>
      </div>
    `;

    const adminMailText = `
New Patient Inquiry Received:
-----------------------------
Sender Name: ${validated.name}
Sender Email: ${validated.email}
Phone Number: ${validated.phone || "Not provided"}
Subject: ${validated.subject || "General Consultation Inquiry"}
Time: ${timestamp}

Message:
${validated.message}
    `.trim();

    await emailProvider.sendEmail({
      to: adminEmail,
      subject: `📬 New Inquiry from ${validated.name}: ${validated.subject || "Patient Contact Form"}`,
      text: adminMailText,
      html: adminMailHtml,
    });

    // 2. Send courtesy confirmation to the user who filled the form
    const userMailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="background-color: #0d9488; padding: 16px 20px; border-radius: 8px; color: #ffffff; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px;">Thank You for Contacting Us</h2>
        </div>
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
          Dear <strong>${validated.name}</strong>,
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          We have successfully received your inquiry regarding <em>"${validated.subject || "Consultation"}"</em>. Our clinical care team is reviewing your message and will get back to you shortly.
        </p>
        <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #475569;">
          <strong>Your submitted message:</strong><br />
          ${validated.message}
        </div>
        <p style="font-size: 13px; color: #64748b;">
          Warm regards,<br />
          <strong>Doctor Plus Medical Clinic Desk</strong>
        </p>
      </div>
    `;

    emailProvider.sendEmail({
      to: validated.email,
      subject: `We have received your message - Clinic Care Desk`,
      text: `Hello ${validated.name},\n\nWe have received your inquiry and will get back to you shortly.\n\nWarm regards,\nClinic Team`,
      html: userMailHtml,
    }).catch((e) => console.error("[Contact API] User courtesy email failed:", e));

    return successResponse(
      { sent: true },
      "Thank you! Your inquiry has been sent directly to our administration desk. We will get back to you shortly."
    );
  } catch (error) {
    return handleApiError(error);
  }
}
